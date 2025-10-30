#Knowledge your password
Hi, My name is Tran Nguyen Thai Tuan
This small project was created with the goal of raising awareness about password security and encouraging people to use stronger, safer passwords in their daily lives. Everything runs entirely in the browser — no passwords are stored, logged, or sent anywhere. This project is built for learning, experimentation, and promoting better password hygiene for everyone.

#Get start
1.Set everything up
Ensure that you have installed Python 3.8+

Use cd command to the current project
'cd C\....\passwordFiltering_server\'

Then install requirements library:
pip install -r requirements.txt

2 Run server
Start the FastAPI server : 
uvicorn main:app --reload --host 0.0.0.0 --port 5583

Server wil run at http://127.0.0.1:8000

3 Using API
To get 100 common weak password
GET /api/weak100

To get 100 random common weak password
GET /api/weak100/randomlist

4 Using web interface
Open file index.html in browser and enjoy

Note: 
This project I running at local, not saving any user's password
