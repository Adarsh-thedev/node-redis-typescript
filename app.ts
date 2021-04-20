import express, { RequestHandler } from "express";
import fetch from "node-fetch";
import redis from "redis";

const REDIS_PORT: any = process.env.REDIS_PORT || 6379;

const app = express();
const client = redis.createClient(REDIS_PORT);
app.use(express.json());

// Set response
const setResponse = (username: string, repos: string) => {
  return `<h2>${username} has ${repos} Github repos</h2>`;
};

const getRepos = async (
  req: { params: { username: string } },
  res: express.Response
) => {
  try {
    console.log("Fetching Data...");

    const { username } = req.params;

    const response = await fetch(`https://api.github.com/users/${username}`);

    const data = await response.json();

    const repos: string = data.public_repos;

    // Set data to Redis
    client.setex(username, 3600, repos);

    return res.send(setResponse(username, repos));
  } catch (err) {
    return res.status(500).json({ err: err });
  }
};

//cache data to Redis
const cacheData: RequestHandler<{ username: string }> = (req, res, next) => {
  const { username } = req.params;
  client.get(username, (err, data) => {
    if (err || !data) {
      res.status(500).json({ err: err });
    }
    if (data) {
      res.send(setResponse(username, data));
    } else {
      next();
    }
  });
};

app.get("/repos/:username", cacheData, getRepos);

app.listen(3000, () => console.log("App is runnning..."));
