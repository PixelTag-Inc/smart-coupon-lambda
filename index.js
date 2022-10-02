

// Used for testing in local env
//require('dotenv').config();
var AWS = require('aws-sdk'),
    region = "us-west-2";
const https = require('https');
var querystring = require('querystring');
const utility = require('./scripts/utility.js');
const { 
  MembershipList,
  MembershipListRequestOptions,
  getMemberList,
  insertList,
  updateList,
} = require('./scripts/database.js');
const Web3 = require('web3');
const ABI = require('./static/GroupFactory.json');

const contractAddress = process.env.GROUP_FACTORY_ADDRESS;
const wsUri = process.env.WS_URI;
const days = 60;

let networkId; 

const getRequest = async (event) => {
  if (event.rawPath === '/address') {
    let options = MembershipListRequestOptions();
    const userAddress = event.queryStringParameters?.memberAddress;
    const chainId =  Number(event.queryStringParameters?.chainId);
    
    options.expressionMap = {
      ':chainId' : chainId,
      ':memberAddress' : userAddress, 
    };
    console.log(options);
    return getMemberList(options);
  }else {
    return Promise.resolve([]);
  }
}

const postRequest = async (event) => {
  if (event.rawPath === '/update-membership-list') {
    // Add functionality to consume transactions from Alchemy
    //return upsertSetting(JSON.parse(event.body));
    return Promise.resolve([]);
  } else if (event.rawPath === '/alchemy') {
    handleAlchemyTransaction(event);
  } 
}

const handler = (event, context) => {
  if (event.requestContext.http.method === 'POST') {
    postRequest(event).then((results, err) => {
      console.log(results,err);
      context.done(null, {
        statusCode: 200, // default value
        body: JSON.stringify({err, results})
      });
    })
  } else if (event.requestContext.http.method === 'GET') {
    getRequest(event).then((results, err) => {
      console.log(results, err);
      context.done(null, {
        statusCode: 200, // default value
        body: JSON.stringify({err, results: results["Items"]})
      });
    })
  }
}; 

const buildMemberList = (groupId, allocation) => {
  let memberList = MembershipList();
  memberList.chainId = 
    process.env.NODE_ENV === 'local' ? 31337 : 
    process.env.NODE_ENV === 'dev' ? 80001 : 80001
  ;
  memberList.groupId = groupId;
  memberList.allocation = allocation;
  return memberList;
  
};

const handleAlchemyTransaction = (event) => {
  console.log(event.body, typeof event.body);
  const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
  const contract = new web3.eth.Contract(ABI.abi, contractAddress);
  //let data = JSON.parse(event.body);
  const tempTransactionHash = event.body;
  console.log('tempTransactioHash',tempTransactionHash);
  web3.eth.getTransaction(tempTransactionHash, (err,result) => {
    console.log(err, result);
    const blockNum = result.blockNumber;
    console.log('blockNumber', blockNum);
    contract.getPastEvents('GroupCreate', {fromBlock:blockNum-1, toBlock:blockNum}, (err2, events) => {
      console.log(events.length)
      const finalEvent = events.find((event) => {
        return event.transactionHash === tempTransactionHash;
      });
      if (finalEvent) {
        const memberList = buildMemberList(Number(finalEvent.returnValues.groupIndex), [finalEvent.returnValues.sender]);
        insertList(memberList).then((val) => {
          console.log('success', val);
        }).catch((err) => {
          console.log('error', err);
        });
      }
    });

    contract.getPastEvents('MembershipUpdate', {fromBlock:blockNum-1, toBlock:blockNum}, (err2, events) => {
      console.log(events.length)
      const finalEvent = events.find((event) => {
        return event.transactionHash === tempTransactionHash;
      });
      if (finalEvent) {
        const memberList = buildMemberList(Number(finalEvent.returnValues.groupIndex), finalEvent.returnValues.allocation);
        insertList(memberList).then((val) => {
          console.log('success', val);
        }).catch((err) => {
          console.log('error', err);
        });
      }
    });
    
  });
}

exports.handler = handler;

if (process.env.NODE_ENV === 'local') {
  const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
  const contract = new web3.eth.Contract(ABI.abi, contractAddress);
  // Group Create Subscription
  contract.events.GroupCreate({
  }, function(error, event){ console.log(event); })
  .on("connected", function(subscriptionId){
      console.log('connected group',subscriptionId);
  })
  .on('data', function(event){
    console.log('groupCreate',event.returnValues.sender); // same results as the optional callback above
    const memberList = buildMemberList(Number(event.returnValues.groupIndex), [event.returnValues.sender]);
    insertList(memberList).then((val) => {
      console.log('success', val);
    }).catch((err) => {
      console.log('error', err);
    });
  });

  //Membership Update Subscription
  contract.events.MembershipUpdate({
  }, function(error, event){ console.log(event); })
  .on("connected", function(subscriptionId){
      console.log('connected memberhship',subscriptionId);
  })
  .on('data', function(event){
      console.log('memberhsipUpdate',event);
      const memberList = buildMemberList(Number(event.returnValues.groupIndex), event.returnValues.allocation);
      insertList(memberList).then((val) => {
        console.log('success', val);
      }).catch((err) => {
        console.log('error', err);
      });
  });
}

//handleAlchemyTransaction({body: '0x7637f0ab7db9a3c70584fcf1e0947867952d6620a8a9851885dc2b9578f0ef72'})


