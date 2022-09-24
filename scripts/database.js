require('dotenv').config();
const util = require('util');
const AWS = require('aws-sdk');
const region = "us-west-2";
const queryProjection = 'chainId,groupId,allocation';
const tableName = 'sharerev-membership-list';
AWS.config.update({
  region: region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});
var docClient = new AWS.DynamoDB.DocumentClient();

const upsertList = (event) => {
  console.log(tableName, event);
    var params = {
        TableName: tableName,
        Item: event
    };

    return docClient.put(params).promise();
};

const getMemberList = (options) => {
    var params = {
        TableName: tableName,
        ProjectionExpression: queryProjection,
        FilterExpression: options.expression,
        ExpressionAttributeValues: options.expressionMap
    };

    return docClient.scan(params).promise();
};

const MembershipList = () => {
    return {
        chainId: null,
        groupId: null,
        allocation: []
    };
};

const MembershipListRequestOptions = () => {
    return {
        expression: 'chainId = :chainId AND contains (allocation, :memberAddress)',
        expressionMap: {
          ':chainId' : 80001,
          ':memberAddress' : '12234',
        }
    };
};


exports.MembershipList = MembershipList;
exports.MembershipListRequestOptions = MembershipListRequestOptions;
exports.getMemberList = getMemberList;
exports.upsertList = upsertList;