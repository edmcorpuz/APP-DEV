const express = require("express");
const app = express();

app.use(express.json()); // IMPORTANT: parse JSON body

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});