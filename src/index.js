import express from "express";
import "dotenv/config";
import db from "./db/index.js";
import * as controller from "./controller.js";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/shorten", controller.shorten);
app.get("/redirect", controller.redirect);
app.delete("/shorten/:code?", controller.deleteCode);

if (process.env.NODE_ENV !== "test") {
  app.listen(process.env.PORT, () => {
    console.log("Server is running on port 3000");
  });
}

export default app;
