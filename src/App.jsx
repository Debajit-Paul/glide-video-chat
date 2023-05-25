import { useState } from "react";

import firebase from "firebase/app";
import "firebase/firestore";
import firebaseConfig from "./firebaseConfig.js";

import { Menu } from "./components/Menu";
import { Videos } from "./components/Videos";

import "./App.css";

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

export const pc = new RTCPeerConnection(servers);

function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [joinCode, setJoinCode] = useState("");

  return (
    <>
      {currentPage === "home" ? (
        <>
          <div
            className="fixed top-0 w-[100vw] h-[64px] bg-[#1E51E2] "
            style={{ zIndex: 1 }}
          >
            <img
              src="./logo.png"
              alt="glide logo"
              className="w-[150px] ml-6"
              style={{ position: "relative", zIndex: 9999, top: "-7px" }}
            />
          </div>
          <Menu
            joinCode={joinCode}
            setJoinCode={setJoinCode}
            setPage={setCurrentPage}
          />
        </>
      ) : (
        <Videos
          mode={currentPage}
          callId={joinCode}
          setPage={setCurrentPage}
          pc={pc}
          firebase={firebase}
        />
      )}
    </>
  );
}

export default App;
