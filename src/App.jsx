import { useState, useRef } from "react";

// import { initializeApp } from "firebase/app";
// import { getFirestore } from "firebase/firestore";
// import { collection, addDoc } from "firebase/firestore";
import firebase from "firebase/app";
import "firebase/firestore";
import firebaseConfig from "./firebaseConfig.js";

import { ImPhoneHangUp } from "react-icons/im";
import { MdOutlineMoreVert } from "react-icons/md";
import { MdContentCopy } from "react-icons/md";
import { BiVideoPlus } from "react-icons/bi";

import "./App.css";

//Initialize Firebase

// const firebaseApp = initializeApp(firebaseConfig);

// const firestore = getFirestore(firebaseApp);
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

const pc = new RTCPeerConnection(servers);

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
        <Videos mode={currentPage} callId={joinCode} setPage={setCurrentPage} />
      )}
    </>
  );
}

const Menu = ({ joinCode, setJoinCode, setPage }) => {
  return (
    <div className="h-[100vh]">
      <div className=" flex justify-center md:h-[100vh] md:mt-0 mt-[100px]">
        <div className="flex md:flex-row flex-col justify-between w-[90vw] ">
          <div className="flex flex-col justify-center md:text-left text-center w-screen/2">
            <h1 className=" max-w-[550px] pb-[0.5em] font-medium leading-[3.25rem] text-[44px]">
              Premium video meetings. Now free for everyone.
            </h1>
            <p className=" leading-6 text-[1.125rem] font-normal max-w-[25em] pb-[3em] text-[rgb(95,99,104)]">
              Developed a Peer-to-Peer video calling service built on webRTC for
              secure meetings, to make{" "}
              <span className="text-[#1E51E2] font-bold text-[23px]">
                Glide
              </span>{" "}
              free and available for all.
            </p>
            <div className="sm:flex-row flex flex-col justify-start md:items-center items-start gap-6">
              <button
                onClick={() => setPage("create")}
                className=" bg-[#1E51E2] text-white p-4 rounded font-medium flex items-center gap-2"
              >
                <BiVideoPlus size={25} />
                New meeting
              </button>
              <div>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter joining code"
                  className=" p-2 border-[1px] border-[#5e5e5e] rounded-md mr-6"
                />
                <button
                  onClick={() => setPage("join")}
                  className="hover:text-[#1E51E2] hover:font-semibold"
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center md:my-[60px] my-[100px]">
            <img src="./hero.png" alt="hero" width={550} height={350} />
            <h3 className="text-[1.5rem] font-normal leading-8 mt-[0.75rem]">
              Get a link that you can share
            </h3>
            <p className=" text-center md:w-[28rem] w-[15] leading-5 text-[.875rem] font-normal">
              Click <span className="font-semibold">New meeting</span> to get a
              link that you can send to people that you want to glide with
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Videos = ({ mode, callId, setPage }) => {
  const [webCamActive, setWebCamActive] = useState(false);
  const [roomId, setRoomId] = useState(callId);

  const localRef = useRef();
  const remoteRef = useRef();

  const setupSources = async () => {
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    const remoteStream = new MediaStream();

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };
    localRef.current.srcObject = localStream;
    remoteRef.current.srcObject = remoteStream;

    setWebCamActive(true);

    if (mode == "create") {
      const callDoc = await firestore.collection("calls").doc();
      const offerCandidates = callDoc.collection("offerCandidates");
      const answerCandidates = callDoc.collection("answerCandidates");
      setRoomId(callDoc.id);

      pc.onicecandidate = (event) => {
        event.candidate && offerCandidates.add(event.candidate.toJSON());
      };
      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      };

      await callDoc.set({ offer });

      callDoc.onSnapshot((snapshot) => {
        const data = snapshot.data();
        if (!pc.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          pc.setRemoteDescription(answerDescription);
        }
      });

      answerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            let data = change.doc.data();
            pc.addIceCandidate(new RTCIceCandidate(data));
          }
        });
      });
    } else if (mode === "join") {
      const callDoc = firestore.collection("calls").doc(callId);
      const answerCandidates = callDoc.collection("answerCandidates");
      const offerCandidates = callDoc.collection("offerCandidates");

      pc.onicecandidate = (event) => {
        event.candidate && answerCandidates.add(event.candidate.toJSON());
      };

      const callData = (await callDoc.get()).data();

      const offerDescription = callData.offer;
      await pc.setRemoteDescription(
        new RTCSessionDescription(offerDescription)
      );

      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      };

      await callDoc.update({ answer });

      offerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            let data = change.doc.data();
            pc.addIceCandidate(new RTCIceCandidate(data));
          }
        });
      });
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected") {
        hangUp();
      }
    };
  };

  const hangUp = async () => {
    pc.close();

    if (roomId) {
      let roomRef = firestore.collection("calls").doc(roomId);
      await roomRef
        .collection("answerCandidates")
        .get()
        .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            doc.ref.delete();
          });
        });
      await roomRef
        .collection("offerCandidates")
        .get()
        .then((querySnapshot) => {
          querySnapshot.forEach((doc) => {
            doc.ref.delete();
          });
        });
      await roomRef.delete();
    }
    window.location.reload();
  };

  return (
    <div className="bg-[#202124] w-screen h-screen">
      <video
        ref={localRef}
        autoPlay
        playsInline
        muted
        className="absolute sm:bottom-[40px] bottom-[120px] sm:right-[40px] right-[10px] w-[200px] md:w-[280px] h-[150px] md:h-[180px] z-10 rounded-[8px] bg-[#4A4E51] block object-cover"
      />
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className="absolute top-0 md:top-[2%] sm:left-[10%] left-0 md:left-[10%]  sm:w-[80%] w-[100%]  h-[88%] rounded-[8px] bg-[#3C4043] block object-cover"
      />

      <div className=" absolute bottom-[20px] left-[calc(100vw/2-4rem)] flex gap-10">
        <button
          onClick={hangUp}
          disabled={!webCamActive}
          className=" text-white text-[30px] p-3 bg-red-600 rounded-full flex items-center"
        >
          <ImPhoneHangUp />
        </button>
        <div
          tabIndex={0}
          role="button"
          className="more button bg-white cursor-pointer w-[50px] h-[50px] rounded-full text-[30px] flex items-center justify-center"
        >
          <MdOutlineMoreVert />
          <div className="popover invisible absolute bottom-[100%] sm:left-[100%] left-[40%] p-[20px] text-[1rem] bg-white rounded-[8px] z-50">
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId);
              }}
              className=" flex flex-col items-center justify-center"
            >
              <p>Copy joining code</p>
              <MdContentCopy />
              {roomId}
            </button>
          </div>
        </div>
      </div>

      {!webCamActive && (
        <div className="absolute w-screen h-[100vh] bg-[#e6151565] z-50">
          <div className="absolute top-[calc(100vh/2-8rem)] left-[calc(100vw/2-8rem)] p-5 w-[300px] h-[150px] z-20 bg-white rounded-lg">
            <h3 className="text-[rgb(71,74,77)]">
              Turn on your camera and microphone and start the call
            </h3>
            <div className="flex justify-start gap-6 mt-3">
              <button
                onClick={() => setPage("home")}
                className=" text-[#1E51E2] p-2  rounded font-medium flex items-center gap-2"
              >
                Cancel
              </button>
              <button
                onClick={setupSources}
                className="bg-[#1E51E2] text-white px-4  rounded font-medium flex items-center gap-2"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
