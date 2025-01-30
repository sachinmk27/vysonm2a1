import express from "express";
import "dotenv/config";
import "./drizzle/index.js";
import * as controller from "./controller.js";

const app = express();
app.use(express.json());

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

app.post("/shorten", controller.shorten);
app.get("/redirect", controller.redirect);
app.delete("/shorten/:code?", controller.deleteCode);

if (
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "production"
) {
  app.listen(process.env.PORT, () => {
    console.log("Server is running on port 3000");
  });
}

export default app;
