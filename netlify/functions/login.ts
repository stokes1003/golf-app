import { Handler } from '@netlify/functions';
import * as mongoDB from 'mongodb';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const handler: Handler = async (event) => {
  const client: mongoDB.MongoClient = new mongoDB.MongoClient(
    process.env.DB_CONN_STRING
  );

  try {
    await client.connect();

    const db: mongoDB.Db = client.db('golf-scores');
    const collection: mongoDB.Collection = db.collection('users');

    const requestBody = JSON.parse(event.body || '{}');
    const userName = requestBody.userName;

    if (!userName) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'userName is missing in the request body',
        }),
      };
    }

    const user = await collection.findOne({ userName });

    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }
    // Load hash from your password DB.
    const result = await bcrypt.compare(requestBody.password, user.password);

    if (!result) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }
    const token = jwt.sign({ userName: user.userName }, process.env.JWT_SECRET);

    await client.close();

    return {
      statusCode: 200,
      body: JSON.stringify(user),
      headers: {
        'Set-Cookie': `auth=${token}; path=/`,
      },
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  } finally {
    await client.close();
  }
};

export { handler };