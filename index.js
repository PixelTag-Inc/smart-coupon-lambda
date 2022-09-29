

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
    
    options.expressionMap = {
      ':chainId' : Number(process.env.CHAIN),
      ':memberAddress' : userAddress, 
    };
    console.log(options);
    return getMemberList(options);
  } else {
    return Promise.resolve([]);
  }
}

const postRequest = async (event) => {
  if (event.rawPath === '/update-membership-list') {
    // Add functionality to consume transactions from Alchemy
    //return upsertSetting(JSON.parse(event.body));
    return Promise.resolve([]);
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
  memberList.chainId = process.env.NODE_ENV === 'local' ? 31337 : 80001;
  memberList.groupId = groupId;
  memberList.allocation = allocation;
  return memberList;
  
};

exports.handler = handler;

if (process.env.NODE_ENV === 'local') {
  const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
  const contract = new web3.eth.Contract(ABI.abi, contractAddress);
  // Group Create Subscription
  contract.events.GroupCreate({
  })
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

  const blockNumber = 10;
  //contract.getPastEvents("MembershipUpdate", {fromBlock: blockNumber, toBlock: blockNumber})
}

//handler({executionType : 'episode'}, {});

/*getRequest({
  rawPath : '/address',
  queryStringParameters: {
    memberAddress: '0xe33a4454824D32259D532057De08aC871d3bE8e5'
  }
}).then((results, err) => {
  console.log(results,err);
  process.exit();
})*/
