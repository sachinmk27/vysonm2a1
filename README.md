# URL Shortener API

## Instructions to Run the Project

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/url-shortener-api.git
   cd url-shortener-api
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory by creating a copy from sample.env file.

4. **Run the application:**

   ```bash
   npm start
   ```

5. **Access the API:**
   Open your browser or use a tool like Postman to access the API at [http://localhost:3000](http://localhost:3000)

## Running Tests

1. **Run unit tests:**

   ```bash
   npm test
   ```

2. **Run load test:**

   Need to install k6 tool for this [https://grafana.com/docs/k6/latest/set-up/install-k6/](https://grafana.com/docs/k6/latest/set-up/install-k6/).

   After installing k6

   ```bash
   npm run load-test
   ```

## Additional Scripts

- **Start the development server:**

  ```bash
  npm run dev
  ```
