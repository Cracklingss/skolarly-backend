import app from "@/app";
import dotenv from 'dotenv'

dotenv.config();

const startServer = () => {
  try {
    app.listen(process.env.PORT, () => {
      console.log("Server started successfully!");
    })
  }
  catch(error) {
    console.error(error);
  }
};

startServer();