import { useState } from "react";
import { BiVideoPlus } from "react-icons/bi";
import { BsGithub, BsLinkedin, BsTwitter } from "react-icons/bs";

export const Menu = ({ joinCode, setJoinCode, setPage }) => {
  const [joinButtonDisabled, setJoinButtonDisabled] = useState(true);
  return (
    <div className="h-[100vh]">
      <div className=" flex flex-col items-center justify-center md:h-[100vh] md:mt-0 mt-[100px]">
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
                  onChange={(e) => {
                    setJoinCode(e.target.value);
                    setJoinButtonDisabled(e.target.value === "");
                  }}
                  placeholder="Enter joining code"
                  className=" p-2 border-[1px] border-[#5e5e5e] rounded-md mr-6"
                />
                <button
                  onClick={() => setPage("join")}
                  className={` ${
                    joinButtonDisabled
                      ? "cursor-not-allowed disabled:opacity-50"
                      : "text-[#1E51E2] font-semibold hover:font-extrabold"
                  }`}
                  disabled={joinButtonDisabled}
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
              code that you can send to people that you want to glide with
            </p>
          </div>
        </div>
        <div className="flex flex-row gap-8 text-lg">
          <a href="https://github.com/Debajit-Paul/glide-video-chat">
            <BsGithub />
          </a>
          <a href="https://www.linkedin.com/in/debajit-paul/">
            <BsLinkedin />
          </a>
          <a href="https://twitter.com/Devojit_paul">
            <BsTwitter />
          </a>
        </div>
      </div>
    </div>
  );
};
