const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { User, Exercise } = require("./mongoose-schema");
const app = express();
require("dotenv").config();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async (req, res) => {
  const { username } = req.body;
  try {
    let newUser = new User({ username });
    newUser = await newUser.save();
    res.json(newUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const { _id } = req.params;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newExercise = new Exercise({
      user: _id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    await newExercise.save();

    // Update the user's exercises array
    user.exercises.push(newExercise);
    await user.save();

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  console.log(from, to, limit);
  try {
    const queryOptions = {
      path: "exercises",
      match: {},
    };

    if (from) queryOptions.match.date = { $gte: new Date(from) };
    if (to)
      queryOptions.match.date = {
        ...queryOptions.match.date,
        $lte: new Date(to),
      };
    if (limit) queryOptions.options = { limit: parseInt(limit) };

    const user = await User.findById(_id).populate(queryOptions).exec();

    if (!user) return res.status(404).json({ message: "User not found" });

    const log = user.exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }));
    const exerciseCount = await Exercise.count({
      user: _id,
      ...(from && { date: { $gte: new Date(from) } }),
      ...(to && { date: { $lte: new Date(to) } }),
    });
    console.log({
      username: user.username,
      count: exerciseCount,
      _id: user._id,
      log,
    });
    res.json({
      username: user.username,
      count: exerciseCount,
      _id: user._id,
      log,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
