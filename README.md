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


```mermaid
flowchart LR
    %% Clients
    U[User (Browser Desktop/Mobile)] -->|Enter password / Click button| FE

    %% Frontend
    subgraph FE[Frontend (Static Web)]
      I[index.html]
      M[main.js (Calls 3 APIs depending on UI)]
      ST[style.css / UI]
      I --> M
    end

    %% Backend
    subgraph BE[Backend (FastAPI)]
      MP[main.py (/api/check)]
      GW[get_weak_100.py (/api/weak100, /api/weak100/randomlist)]
      LIB[zxcvbn library]
      DS[(weak_passwords dataset)]
      MP --> LIB
      GW --> DS
    end

    %% Connections
    U -->|HTTP GET/POST| I
    M -->|fetch /api/check| MP
    M -->|fetch /api/weak100| GW
    M -->|fetch /api/weak100/randomlist| GW

    %% Responses
    MP -->|JSON {score, guesses, suggestions...}| M
    GW -->|JSON top100 / randomlist| M

    %% Deployment
    subgraph DEPLOY[Deployment (Render / Nginx + Uvicorn)]
      NG[Nginx (Static Hosting)]
      UV[Uvicorn (App Server)]
    end

    FE -.static files.-> NG
    BE -.runs on.-> UV
