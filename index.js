const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const cors = require('cors')
const crypto = require('crypto')
const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

let User, Exercise

const ExerciseSchema = new mongoose.Schema({
  userId: String,
	username: String,
	description: String,
  duration: Number,
  date: String
});

const UserSchema = new mongoose.Schema({

  username: {type: String, required: true},
  exercises: [ExerciseSchema]
})

User = mongoose.model('User', UserSchema)

Exercise = mongoose.model('Exercise', ExerciseSchema);

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});



app.post('/api/users', async function(req, res) {
  const user = req.body.username;

  const u = new User({ username: user });
  
  try {
    const data = await u.save();
    res.json({ username: data.username, _id: data._id });
  } catch (err) {
    res.status(500).json({ error: 'Error saving user to the database' });
  }
});

app.get('/api/users', async function(req, res) {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

app.post('/api/users/:_id/exercises', async function (req, res) {
  var userId = req.params._id;
  var description = req.body.description;
  var duration = req.body.duration;
  var date = req.body.date;

  

  
  if (!date) {
      date = new Date().toISOString().substring(0, 10);
  }

  console.log(
      'looking for user with id ['.toLocaleUpperCase() + userId + '] ...'
  );

  try {
      
      const userInDb = await User.findById(userId);

      if (!userInDb) {
          return res.json({ message: 'There are no users with that ID in the database!' });
      }

      
      const newExercise = new Exercise({
          userId: userInDb._id,
          username: userInDb.username,
          description: description,
          duration: parseInt(duration),
          date: date,
      });

      const exercise = await newExercise.save();

      res.json({
          username: userInDb.username,
          description: exercise.description,
          duration: exercise.duration,
          date: new Date(exercise.date).toDateString(),
          _id: userInDb._id,
      });
  } catch (err) {
      console.error(err);
      res.json({ message: 'Exercise creation failed!' });
  }
});


app.get('/api/users/:_id/logs', async function (req, res) {
	const userId = req.params._id;
	const from = req.query.from || new Date(0).toISOString().substring(0, 10);
	const to =
		req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
	const limit = Number(req.query.limit) || 0;

	console.log('### get the log from a user ###'.toLocaleUpperCase());

	//? Find the user
	let user = await User.findById(userId).exec();

	console.log(
		'looking for exercises with id ['.toLocaleUpperCase() + userId + '] ...'
	);

	//? Find the exercises
	let exercises = await Exercise.find({
		userId: userId,
		date: { $gte: from, $lte: to },
	})
		.select('description duration date')
		.limit(limit)
		.exec();

	let parsedDatesLog = exercises.map((exercise) => {
		return {
			description: exercise.description,
			duration: exercise.duration,
			date: new Date(exercise.date).toDateString(),
		};
	});

	res.json({
		_id: user._id,
		username: user.username,
		count: parsedDatesLog.length,
		log: parsedDatesLog,
	});
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
