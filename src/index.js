import express from "express";
import "dotenv/config";
import db from "./db.js";

import * as router from "./controller.js";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/shorten", router.shorten);
app.get("/redirect", router.redirect);

if (process.env.NODE_ENV === "development") {
  app.listen(process.env.PORT, () => {
    console.log("Server is running on port 3000");
    db.initializeDB();
  });
}

export default app;
