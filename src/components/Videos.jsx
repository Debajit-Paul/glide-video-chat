import { useState, useRef } from "react";

import { ImPhoneHangUp } from "react-icons/im";
import { MdOutlineMoreVert } from "react-icons/md";
import { MdContentCopy } from "react-icons/md";
import {
  BsMic,
  BsMicMute,
  BsCameraVideo,
  BsCameraVideoOff,
} from "react-icons/bs";

import { pc, firestore } from "../App";

export const Videos = ({ mode, callId, setPage }) => {
  const [webCamActive, setWebCamActive] = useState(false);
  const [roomId, setRoomId] = useState(callId);
  const [videoToggle, setVideoToggle] = useState(true);
  const [micToggle, setMicToggle] = useState(true);

  const localRef = useRef();
  const remoteRef = useRef();

  const setupSources = async () => {
    // Getting camera access of local user
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    // Initializing remote user media stream
    const remoteStream = new MediaStream();

    // Collecting local user's audio and video track in peerConnection
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // listining for peer stream for any track and setting it to remote user
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };

    // setting local and remote users data to there refs
    localRef.current.srcObject = localStream;
    remoteRef.current.srcObject = remoteStream;

    setWebCamActive(true);

    if (mode == "create") {
      // creating a DOC in firestore
      const callDoc = await firestore.collection("calls").doc();

      // creating another doc inside main DOC for offering ICE
      const offerCandidates = callDoc.collection("offerCandidates");

      // creating another doc inside main DOC for answring ICE
      const answerCandidates = callDoc.collection("answerCandidates");

      // ID of firestore DOC is the video session id
      setRoomId(callDoc.id);

      // listining for local user's ICE candidates
      // and setting it inside offerCandidates doc
      pc.onicecandidate = (event) => {
        event.candidate && offerCandidates.add(event.candidate.toJSON());
      };

      // creating peer offer and keeping a copy of SDP as offerDescription
      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      };

      // sending a SDP offer to firestore doc
      await callDoc.set({ offer });

      // listining for remote user's SDP
      // and setting it inside answerDescription
      callDoc.onSnapshot((snapshot) => {
        const data = snapshot.data();
        if (!pc.currentRemoteDescription && data?.answer) {
          const answerDescription = new RTCSessionDescription(data.answer);
          pc.setRemoteDescription(answerDescription);
        }
      });

      // listining for remote user's ICE Candidates
      // and setting it inside addIceCandidate
      answerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            let data = change.doc.data();
            pc.addIceCandidate(new RTCIceCandidate(data));
          }
        });
      });
    } else if (mode === "join") {
      // same thing as before but now as a remote user answring

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
    <div className="bg-[#202124] w-screen h-[100%]">
      <video
        ref={localRef}
        autoPlay
        playsInline
        muted
        className={`absolute md:bottom-[17%] bottom-[17%] md:right-[3%] right-[3%] w-[35%] md:w-[20%] h-[24%] md:h-[30%] z-10 rounded-[8px] bg-[#4A4E51] block object-cover`}
      />
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className="absolute top-0 md:top-[3%] left-0 md:left-[5%] md:w-[70%] w-[100%] md:h-[80%] h-[87%] rounded-[8px] bg-[#3C4043] block object-cover"
      />

      <div className=" absolute md:bottom-[4%] bottom-[3%] md:left-[calc(100vw/2-8rem)] left-[calc(100vw/2-8.5rem)] flex gap-6">
        <button
          title="Camera"
          onClick={async () => {
            let videoTrack = localRef.current.srcObject
              .getTracks()
              .find((track) => track.kind === "video");
            setVideoToggle((prevEnabled) => !prevEnabled);
            videoTrack.enabled
              ? (videoTrack.enabled = false)
              : (videoTrack.enabled = true);
          }}
          className="bg-white cursor-pointer w-[47px] h-[47px] rounded-full text-[30px] flex items-center justify-center"
        >
          {videoToggle ? <BsCameraVideo /> : <BsCameraVideoOff />}
        </button>
        <button
          title="Mic"
          onClick={async () => {
            let audioTrack = localRef.current.srcObject
              .getTracks()
              .find((track) => track.kind === "audio");
            setMicToggle((prevEnabled) => !prevEnabled);
            audioTrack.enabled
              ? (audioTrack.enabled = false)
              : (audioTrack.enabled = true);
          }}
          className="bg-white cursor-pointer w-[47px] h-[47px] rounded-full text-[30px] flex items-center justify-center"
        >
          {micToggle ? <BsMic /> : <BsMicMute />}
        </button>

        <button
          title="HangUp"
          onClick={hangUp}
          disabled={!webCamActive}
          className=" text-white text-[25px] p-3 bg-red-600 rounded-full flex"
        >
          <ImPhoneHangUp />
        </button>
        <div
          title="More"
          tabIndex={0}
          role="button"
          className="more button bg-white cursor-pointer w-[47px] h-[47px] rounded-full text-[30px] flex items-center justify-center"
        >
          <MdOutlineMoreVert />
          <div className="popover invisible absolute bottom-[100%] sm:left-[100%] left-[40%] p-[20px] text-[1rem] bg-white rounded-[8px] z-50">
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId);
              }}
              className=" flex flex-col items-center justify-center gap-2"
            >
              <p className=" flex items-center gap-4">
                <MdContentCopy /> Copy joining code
              </p>
              <code className=" bg-slate-200 p-3 rounded-md">{roomId}</code>
            </button>
          </div>
        </div>
      </div>

      {!webCamActive && (
        <div className="absolute w-screen h-[100vh] bg-[#00000065] z-50">
          <div className="absolute top-[calc(100vh/2-8rem)] left-[calc(100vw/2-8rem)] p-5 w-[300px] h-[155x] flex flex-col z-20 bg-white rounded-lg">
            <h3 className="text-[rgb(148,147,147)]">
              Click on start to Turn on your camera and microphone
            </h3>
            <i className=" font-light text-sm">(click more to share code)</i>
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
