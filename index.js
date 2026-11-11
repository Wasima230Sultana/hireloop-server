import express from 'express' 
import cors from 'cors'
import 'dotenv/config'
import { MongoClient } from 'mongodb';
const app = express()
const port = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGODB_URI);
// console.log(client)
app.use(express.json())
app.use(cors())




export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})