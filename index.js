import express from 'express' 
import cors from 'cors'
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb';
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
const connectedClient = await connectToMongoDB()
const database =  connectedClient.db('hireloopdb')
const users = database.collection('user')
const jobs = database.collection('jobs')
const applications = database.collection("applications");
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/users',async(req,res)=>{
    const cursor = users.find({});
    const result = await cursor.toArray();
    res.send(result)
})

app.get('/jobs',async(req,res)=>{
  const query = {};
    // console.log('query', req.query);
    if (req.query) {
        if (req.query.jobType) {
            query.jobType = req.query.jobType;
        }
        if (req.query.isRemote) {
            query.isRemote = req.query.isRemote === 'true';
        }
        if (req.query.category) {
            query.category = req.query.category;
        }
        if (req.query.search) {
            query.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { company: { $regex: req.query.search, $options: 'i' } },
                { responsibilities: { $regex: req.query.search, $options: 'i' } },
                { requirements: { $regex: req.query.search, $options: 'i' } }
            ];
        }
    }
    const cursor = jobs.find(query);
    const result = await cursor.toArray();
    res.send(result)
})

app.post('/jobs',async(req,res)=>{
    const data = { createdAt: new Date().toISOString(), ...req.body }
    const result = await jobs.insertOne(data)
    res.send(result)
})
app.get('/jobs/:id',async(req,res)=>{
      const id = req.params.id;
      let query
      try {
        query = { _id: new ObjectId(id) }
      } catch {
        return res.status(400).send({ error: 'Invalid job id' })
      }
    const job = await jobs.findOne(query)
    if (!job) {
        return res.status(404).send({ error: 'Job not found' })
    }
    res.send(job)
})
app.delete('/jobs/:id',async(req,res)=>{
      const id = req.params.id;
      let query
      try {
        query = { _id: new ObjectId(id) }
      } catch {
        return res.status(400).send({ error: 'Invalid job id' })
      }
    const result = await jobs.deleteOne(query)
    res.send(result)
})
// Every application is stamped on the server so the client never has to
// trust its own clock, and older documents without these fields still read.
const applicationWithDefaults = (application) => ({
    status: 'Applied',
    appliedAt: new Date().toISOString(),
    ...application,
})

app.get('/applications', async (req, res) => {
    const query = {};
    if (req.query.userId) {
        query.userId = req.query.userId;
    }
    if (req.query.jobId) {
        query.jobId = req.query.jobId;
    }
    if (req.query.status) {
        query.status = req.query.status;
    }
    const cursor = applications.find(query).sort({ appliedAt: -1, _id: -1 });
    const result = await cursor.toArray();
    res.send(result);
})

app.get('/applications/:id', async (req, res) => {
    const id = req.params.id;
    let query
    try {
        query = { _id: new ObjectId(id) }
    } catch {
        return res.status(400).send({ error: 'Invalid application id' })
    }
    const application = await applications.findOne(query)
    if (!application) {
        return res.status(404).send({ error: 'Application not found' })
    }
    res.send(application)
})

// Lets a recruiter move an application through the hiring pipeline.
app.patch('/applications/:id', async (req, res) => {
    const id = req.params.id;
    let query
    try {
        query = { _id: new ObjectId(id) }
    } catch {
        return res.status(400).send({ error: 'Invalid application id' })
    }
    const { status, ...updates } = req.body ?? {}
    const result = await applications.updateOne(query, {
        $set: { ...(status ? { status } : {}), ...updates },
    })
    if (!result.matchedCount) {
        return res.status(404).send({ error: 'Application not found' })
    }
    res.send(result)
})

app.post('/applications', async (req, res) => {
    const application = applicationWithDefaults(req.body ?? {});

    // One application per seeker per job: a second "Apply" click returns the
    // original document instead of creating a duplicate row.
    if (application.userId && application.jobId) {
        const existing = await applications.findOne({
            userId: application.userId,
            jobId: application.jobId,
        });
        if (existing) {
            return res.send({ acknowledged: true, insertedId: existing._id, duplicate: true });
        }
    }

    const result = await applications.insertOne(application);
    res.send(result);
})

// Withdraw / remove an application.
app.delete('/applications/:id', async (req, res) => {
    const id = req.params.id;
    let query
    try {
        query = { _id: new ObjectId(id) }
    } catch {
        return res.status(400).send({ error: 'Invalid application id' })
    }
    const result = await applications.deleteOne(query)
    if (!result.deletedCount) {
        return res.status(404).send({ error: 'Application not found' })
    }
    res.send(result)
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})