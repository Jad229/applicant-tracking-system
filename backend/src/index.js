import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT;

// Start the HTTP server and listen for incoming requests.
app.listen(PORT, () => {
  console.log(`Server Started on Port: ${PORT}`);
});
