import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
// const herokuSSLSetting = { rejectUnauthorized: false };
// const sslSetting = process.env.LOCAL ? false : herokuSSLSetting;
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

const client = new Client(dbConfig);

async function clientConnect() {
  await client.connect();
}
clientConnect();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname + "/../public/index.html"));
});

app.get("/pastes", async (req, res) => {
  const dbres = await client.query("SELECT * FROM pastes;");
  res.json({ status: "Success", data: dbres.rows });
});

app.get("/pastes/recent", async (req, res) => {
  const dbres = await client.query(
    "SELECT * FROM pastes ORDER BY creation_date DESC LIMIT 10;"
  );
  res.json({
    status: "Success",
    data: dbres.rows,
  });
});

app.get<{ id: number }>("/pastes/:id", async (req, res) => {
  const id = req.params.id;
  const dbres = await client.query("SELECT * FROM pastes WHERE id = $1;", [id]);
  if (dbres.rowCount !== 0) {
    res.status(200).json({
      status: "Success",
      data: dbres.rows,
    });
  } else {
    res.status(404).json({
      status: "Failed",
      data: [],
      message: `There is no paste with ID ${id}.`,
    });
  }
});

app.post("/pastes", async (req, res) => {
  let { title, body } = req.body;
  if (title === "") {
    title = null;
  }
  if (body !== "") {
    const dbres = await client.query(
      "INSERT INTO pastes (title, body) VALUES ($1,$2) RETURNING *;",
      [title, body]
    );
    res.status(201).json({
      status: "Success",
      data: dbres.rows,
    });
  } else {
    res.status(400).json({
      status: "cannot submit an empty body",
    });
  }
});

app.delete<{ id: number }>("/pastes/:id", async (req, res) => {
  const id = req.params.id;
  const dbres = await client.query(
    "DELETE FROM pastes WHERE id = $1 RETURNING *;",
    [id]
  );
  if (dbres.rowCount !== 0) {
    res.status(200).json({
      status: "Success",
      message: `Paste with ID ${id} was successfuly deleted.`,
    });
  } else {
    res.status(404).json({
      status: "Failed",
      message: `There is no paste with ID ${id}.`,
    });
  }
});

app.put<{ id: number }>("/pastes/:id", async (req, res) => {
  const id = req.params.id;
  let { title, body } = req.body;
  if (title === "") {
    title = null;
  }
  if (body !== "") {
    const dbres = await client.query(
      "UPDATE pastes SET title = $1, body = $2 WHERE id = $3 RETURNING *;",
      [title, body, id]
    );
    res.status(200).json({
      status: "Success",
      data: dbres.rows,
    });
  } else {
    res.status(400).json({
      status: "Failed",
      message: "Cannot submit an empty body.",
    });
  }
});

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw "Missing PORT environment variable.  Set it in .env file.";
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
