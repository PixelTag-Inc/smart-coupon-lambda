

// Used for testing in local env
//require('dotenv').config();

const Web3 = require('web3');
const ethers = require('ethers');
const ERC20FactoryABI = require('./static/SmartCoupon.json');
const unlockABI = require('./static/Unlock.json');

const factoryAddress = process.env.ERC20_FACTORY_ADDRESS;
const unlockAddress = process.env.UNLOCK_ADDRESS;
const wsUri = process.env.WS_URI;

console.log(wsUri);
const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
const contractAddress = process.env.WORKSMANAGER_ADDRESS_MUMBAI;
const apiUserPrivateKey = process.env.DEVACCOUNTKEY;
const apiUserAddress = process.env.DEVACCOUNTADDRESS;
let networkId = parseInt(process.env.CHAINID);
const apiUserAddressFinal = web3.utils.toChecksumAddress(apiUserAddress);
  
web3.eth.accounts.wallet.add(web3.eth.accounts.privateKeyToAccount(apiUserPrivateKey));

const postRequest = async (event) => {
  if (event.rawPath === '/update-membership-list') {
    // Add functionality to consume transactions from Alchemy
    //return upsertSetting(JSON.parse(event.body));
    return Promise.resolve([]);
  } else if (event.rawPath === '/reward/erc20') {
    return await handleCreateERC20Reward(event);
  } else if (event.rawPath === '/reward/erc721') {
    return await handleCreateUnlockReward(event);
  } else {
    return Promise.resolve({});
  }
}

const handler = (event, context) => {
  if (event.requestContext.http.method === 'POST') {
    postRequest(event).then((address, err) => {
      console.log('postRequest',address,err);
      context.done(null, {
        statusCode: 200, // default value
        body: JSON.stringify({err, address})
      });
    })
  } 
}; 

//function createErc20Token(string calldata tokenName, string calldata symbol, uint256 supply, address to) external returns(address)
const handleCreateERC20Reward = async (event) => {
  console.log(event.body, typeof event.body);
  const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
  const contract = new web3.eth.Contract(ERC20FactoryABI.abi, factoryAddress);
  //let data = JSON.parse(event.body);

  const tempData = JSON.parse(event.body);
  console.log(tempData, typeof tempData);
  console.log(tempData.initialSuppy);
  return contract.methods.createErc20Token(tempData.name, tempData.symbol, ethers.BigNumber.from(tempData.initialSuppy), apiUserAddressFinal).send({from:apiUserAddressFinal});
}

const handleCreateUnlockReward= async (event) => {
  console.log(event.body, typeof event.body);
  const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
  
  const contract = new web3.eth.Contract(unlockABI.abi, UNLOCK_ADDRESS);
  //let data = JSON.parse(event.body);

  const tempData = event.body;
  return contract.methods.createErc20Token(tempData.name, tempData.symbol, ethers.BigNumber.from(tempData.initialSuppy), apiUserAddressFinal).send({from:apiUserAddressFinal});
}

exports.handler = handler;

