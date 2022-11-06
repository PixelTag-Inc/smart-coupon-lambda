

// Used for testing in local env
require('dotenv').config();
const nftStore = require('nft.storage');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));


const Web3 = require('web3');
const ethers = require('ethers');
const ERC20FactoryABI = require('./static/SmartCoupon.json');
const ERC20SourceABI = require('./static/ERC20_Source.json');
const unlockABI = require('./static/Unlock.json');
const publicLockABI = require('./static/PublicLock.json');

const nftStorageApiKey = process.env.NFT_STORAGE_API_KEY;
const nftStorageClient = new nftStore.NFTStorage({ token: nftStorageApiKey })

const factoryAddress = process.env.ERC20_FACTORY_ADDRESS;
const unlockAddress = process.env.UNLOCK_ADDRESS;
const wsUri = process.env.PUBLIC_WS_URI;

console.log(wsUri);
//const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
const contractAddress = process.env.WORKSMANAGER_ADDRESS_MUMBAI;
const apiUserPrivateKey = process.env.API_ETH_PRIVATE_KEY;
const apiUserAddress = process.env.API_ETH_ADDRESS;
let networkId = parseInt(process.env.CHAINID);

const postRequest = async (event) => {
  if (event.rawPath === '/reward/erc20') {
    return await handleCreateERC20Reward(event);
  } else if (event.rawPath === '/reward/erc721') {
    return await handleCreateUnlockReward(event);
  } else {
    return Promise.resolve({});
  }
}

const putRequest = async (event) => {
  if (event.rawPath === '/reward/erc20') {
    return await handleRewardUserERC20(event);
  } else if (event.rawPath === '/reward/erc721') {
    return await handleRewardUserERC721(event);
  } else {
    return Promise.resolve({});
  }
}

const handler = (event, context) => {
  if (event.requestContext.http.method === 'POST') {
    postRequest(event).then((address) => {
      console.log('postRequest',address);
      context.done(null, {
        statusCode: 200, // default value
        body: address
      });
    })
  } else if (event.requestContext.http.method === 'PUT') {
    putRequest(event).then((address) => {
      console.log('putRequest',address);
      context.done(null, {
        statusCode: 200, // default value
        body: address
      });
    })
  }
}; 

const handleCreateERC20Reward = async (event) => {
  const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
  const apiUserAddressFinal = web3.utils.toChecksumAddress(apiUserAddress);
  web3.eth.accounts.wallet.add(web3.eth.accounts.privateKeyToAccount(apiUserPrivateKey));
  const contract = new web3.eth.Contract(ERC20FactoryABI.abi, factoryAddress);
  //let data = JSON.parse(event.body);

  const _data = JSON.parse(event.body);
  return contract.methods.createErc20Token(_data.name, _data.symbol, ethers.utils.parseEther(_data.initialSupply), apiUserAddressFinal).estimateGas({from:apiUserAddressFinal}).then((gasAmount) => {
    const gasprice = gasAmount * 2;
    console.log('running post data');
    return contract.methods.createErc20Token(_data.name, _data.symbol,  ethers.utils.parseEther(_data.initialSupply), apiUserAddressFinal).send({from:apiUserAddressFinal, gas: gasprice.toFixed(0)});
  }).then((res, err) => {
    console.log('success',res);
    return res.events['0'].address;
  }).catch((err) => {
    console.log('error',err);
    return err;
  })
  
}

const handleCreateUnlockReward = async (event) => {
  const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
  const apiUserAddressFinal = web3.utils.toChecksumAddress(apiUserAddress);
  web3.eth.accounts.wallet.add(web3.eth.accounts.privateKeyToAccount(apiUserPrivateKey));
  const contract = new web3.eth.Contract(unlockABI.abi, unlockAddress);
  //let data = JSON.parse(event.body);

  const _data = JSON.parse(event.body);
  const salt = web3.utils.randomHex(12);
  return contract.methods.createLock(
    ethers.constants.MaxUint256, 
    ethers.constants.AddressZero, 
    ethers.constants.Zero, 
    ethers.constants.MaxUint256, 
    _data.name, 
    salt
  ).estimateGas({from:apiUserAddressFinal})
  .then((gasAmount) => {
    console.log(gasAmount);
    const gasprice = gasAmount * 2;
    console.log('running post data');
    return contract.methods.createLock(
      ethers.constants.MaxUint256, 
      ethers.constants.AddressZero, 
      ethers.constants.Zero, 
      ethers.constants.MaxUint256, 
      _data.name, 
      salt
    ).send({from:apiUserAddressFinal, gas: ethers.BigNumber.from(gasprice.toFixed(0))});
  }).then((res, err) => {
    console.log('success',res, err);
    
    return res.events['NewLock'].address;
  }).catch((err) => {
    console.log('error',err);
    return err;
  })
}

const handleRewardUserERC20 = async (event) => {
  const _data = JSON.parse(event.body); // contractAddress, amount, walletAddress
  const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
  const apiUserAddressFinal = web3.utils.toChecksumAddress(apiUserAddress);
  web3.eth.accounts.wallet.add(web3.eth.accounts.privateKeyToAccount(apiUserPrivateKey));
  const contract = new web3.eth.Contract(ERC20SourceABI.abi, web3.utils.toChecksumAddress(_data.contractAddress));
  //let data = JSON.parse(event.body);

  return contract.methods.mint(web3.utils.toChecksumAddress(_data.walletAddress),  ethers.utils.parseEther(_data.amount)).estimateGas({from:apiUserAddressFinal}).then((gasAmount) => {
    const gasprice = gasAmount * 2;
    console.log('running post data');
    return contract.methods.mint(web3.utils.toChecksumAddress(_data.walletAddress), ethers.utils.parseEther(_data.amount)).send({from:apiUserAddressFinal, gas: gasprice.toFixed(0)});
  }).then((res, err) => {
    console.log('success',res);
    return 'success';
  }).catch((err) => {
    console.log('error',err);
    return err;
  })
  
}

const handleRewardUserERC721 = async (event) => {
  const _data = JSON.parse(event.body); // contractAddress, amount, walletAddress, name, imageUrl, symbol
  const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
  const apiUserAddressFinal = web3.utils.toChecksumAddress(apiUserAddress);
  web3.eth.accounts.wallet.add(web3.eth.accounts.privateKeyToAccount(apiUserPrivateKey));
  const contract = new web3.eth.Contract(publicLockABI.abi, web3.utils.toChecksumAddress(_data.contractAddress));
  //let data = JSON.parse(event.body);

  const salt = web3.utils.randomHex(12);
  const [imageBase64, filetype] = await convertURIToImageData(_data.imageUrl);
  const nft = await storeNFTMetadata(_data.name, _data.name+' NFT', imageBase64, filetype, {});

  
  return contract.methods.grantKeys(
    [web3.utils.toChecksumAddress(_data.walletAddress)], 
    [ethers.constants.MaxUint256],
    [apiUserAddressFinal]
  ).estimateGas({from:apiUserAddressFinal})
  .then((gasAmount) => {
    console.log(gasAmount);
    const gasprice = gasAmount * 2;
    console.log('running post data');
    return contract.methods.grantKeys(
      [web3.utils.toChecksumAddress(_data.walletAddress)], 
      [ethers.constants.MaxUint256],
      [apiUserAddressFinal]
    ).send({from:apiUserAddressFinal, gas: ethers.BigNumber.from(gasprice.toFixed(0))});
  }).then((res, err) => {
    console.log('success grantKeys',res, err);
    return contract.methods.setLockMetadata(_data.name, _data.symbol, nft.url);
  }).then((res, err) => {
    console.log('success setLockMetadata',res, err);
    return 'success';
  }).catch((err) => {
    console.log('error',err);
    return err;
  })
}

const convertURIToImageData = async (url) => {
  if (!url) {
    return null;
  }
  const httpOptions = {
    method: "GET",
    url: url,
    responseType: "stream"
  };
  let filetype = '';
  //const result = await axios(httpOptions);
  //return new Blob([result.data.toString('base64')], {type: result.headers['content-type']});
  return fetch(url)
  .then(res => res.blob()) // Gets the response and returns it as a blob
  .then(blob => {
    filetype = blob.type;
    return blob.arrayBuffer();
    //return  new File([blob], fileName, { lastModified: new Date().getTime(), type: blob.type });
  }).then(arrayBuffer => {
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    const returnString = 'data:'+filetype+';base64,'+base64String;
    return [returnString, filetype];
  });

  

  /*return axios(httpOptions).then((result, err) => {
    //console.log(result.data)
    //let data = "data:" + result.headers["content-type"] + ";base64," + Buffer.from(result.data).toString('base64')
    return Buffer.from(result.data).toString('base64');
  });*/
}

if (!String.format) {
  String.format = function(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number] 
        : match
      ;
    });
  };
}

const storeNFTMetadata = async (name, description, image, filetype, mapping) => {
  let rawObj = {};
  if (image) {
    rawObj = {
      name: name,
      description: description,
      image: new File(
        [
          image
        ],
        'image',
        { type: filetype }
      )
    };
  } 

  if (mapping) {
    for(let m in mapping) {
      rawObj[m] = mapping[m];
    }
  }

  let metadata = await nftStorageClient.store(rawObj);
  return metadata;
};

exports.handler = handler;
//const temp = 5000;
//console.log(ethers.BigNumber.from(temp))
//const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
/*const web3 = new Web3(new Web3.providers.WebsocketProvider(wsUri));
const apiUserAddressFinal = web3.utils.toChecksumAddress(apiUserAddress);
web3.eth.accounts.wallet.add(web3.eth.accounts.privateKeyToAccount(apiUserPrivateKey));
const contract = new web3.eth.Contract(ERC20FactoryABI.abi, factoryAddress);
//let data = JSON.parse(event.body);

const _data = {
  "type": "erc721",
  "symbol": "AD1-A",
  "name": "Welcome NFT",
  "initialSupply": "5000",
  "imageUrl": "https://brand.assets.adidas.com/image/upload/f_auto,q_auto,fl_lossy/enUS/Images/rfto-logo-small-d_tcm221-895039.png"
};

return contract.methods.createErc20Token(_data.name, _data.symbol, ethers.utils.parseEther(_data.initialSupply), apiUserAddressFinal).estimateGas({from:apiUserAddressFinal}).then((gasAmount) => {
  const gasprice = gasAmount * 1.4;
  console.log('running post data');
  return contract.methods.createErc20Token(_data.name, _data.symbol,  ethers.utils.parseEther(_data.initialSupply), apiUserAddressFinal).send({from:apiUserAddressFinal, gas: gasprice.toFixed(0)});
}).then((res, err) => {
  console.log('success',res);
  return res.events['0'].address;
}).catch((err) => {
  console.log('error',err);
  return err;
})*/