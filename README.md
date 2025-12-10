
Stock Dashboard (Real-Time Broker Client Simulator)

A React + Firebase based stock dashboard that simulates a real-time broker client system.
Users can sign up, log in, subscribe to stocks, track real-time simulated stock prices, and manage their personalized stock list.
The project uses Firebase Authentication and Firestore for storing user subscriptions and simulated live market data.

 Features
 
 User Authentication
•	Email/Password Sign Up & Login
•	Anonymous login fallback
•	Secure Firebase Authentication integration
•	Custom token support

Real-Time Stock Prices
•	Live stock price updates every second
•	Trend indicators (📈 rising / 📉 falling)
•	Smooth UI transitions and color-coded price movements

 User-Specific Stock Subscriptions
•	Subscribe/unsubscribe to chosen stocks
•	Your subscriptions stored privately in Firestore
•	Data auto-updated via real-time Firestore listeners

Cloud Firestore Integration
•	Public collection simulating stock market price feed
•	User-specific private subscription collection
•	Snapshot listeners for instant UI updates
________________________________________

 Project Structure
src/
 └── App.jsx      # Main React application logic (UI + Firebase Integration)
public/
package.json
README.md
________________________________________
 Technologies Used
 
Technology        	        Purpose
React                 	    Frontend UI and state management
Firebase Authentication   	Secure login and account management
Firestore Database         	Real-time syncing of stock prices & user subscriptions
TailwindCSS               	Modern UI styling
Vite / React Scripts	      Development environment
________________________________________

Installation & Setup

1️. Clone the Repository
git clone https://github.com/deena-dsouza/stock_dashboard.git
cd stock_dashboard

2️. Install Dependencies
npm install

3. Start the App
npm run dev

 How the Simulation Works
 
 Stock Price Generator
•	A random price change ±0.5% is applied every second
•	Updates are written to Firestore
•	Frontend listens in real-time and updates UI

 Subscriptions
•	When a user subscribes, a Firestore document is created
•	Unsubscribing deletes the document
•	UI instantly updates because of snapshot listeners


