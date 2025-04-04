# URL Shortener API

## Instructions to Run the Project

1. **Clone the repository:**

   ```bash
   git clone https://github.com/sachinmk27/vysonm2a1.git vysonm2a1-sachin
   cd vysonm2a1-sachin
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory by creating a copy from sample.env file.

   ```bash
   cp .env.sample .env
   ```

4. **Run database migrations:**

   ```bash
   npm run db:migrate
   ```

5. **Run the application:**

   ```bash
   npm start
   ```

6. **Access the API:**
   Open your browser or use a tool like Postman to access the API at [http://localhost:3000](http://localhost:3000)

## Running Tests

1. **Run unit tests:**

   ```bash
   npm run test
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
