import express from "express";

import controllers from "./controllers/index.js";
import verifyApiKey from "./middlewares/verifyApiKey.js";

const app = express();
app.use(express.json());

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

app.post("/shorten", verifyApiKey, controllers.shorten);
app.get("/redirect", controllers.redirect);
app.delete("/shorten/:code?", verifyApiKey, controllers.deleteCode);

if (
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "production"
) {
  app.listen(process.env.PORT, () => {
    console.log("Server is running on port 3000");
  });
}

export default app;
