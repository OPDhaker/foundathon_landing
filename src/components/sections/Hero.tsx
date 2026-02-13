import { ArrowRight } from "lucide-react";

const content = {
  caption: "let's go founders!!  2026",
  heading: "build something",
  headingHighlight: "good",
  description:
    "lorem100 ipsum dolor sit amet, consectetur adipiscing elit. sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  
};

const Hero = () => {
  return (
    <div className="bg-gray-200 text-foreground font-mono relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 opacity-70"
        style={{ backgroundImage: "url(/textures/circle-16px.svg)" }}
      />
      <div className="bg-fnyellow blur-2xl size-90 rounded-full absolute top-30 left-20 inset-0 opacity-20 z-10" />
      <div className="bg-fnblue blur-[100px] size-120 rounded-full absolute top-150 left-250 inset-0 opacity-20 z-10" />
      <div className="fnconatiner relative flex items-center justify-center h-[92vh] z-10">
        <div className="flex flex-col items-center gap-6 max-w-4xl">
          <div className="rounded-full px-3 uppercase font-bold tracking-wide bg-fngreen/20 text-fngreen border-2 border-fngreen">
            {content.caption}
          </div>
          <h1 className="text-7xl font-bold tracking-tighter uppercase text-center text-balance">
            {content.heading}{" "}
            <span className="text-fnblue italic font-extrabold">
              {content.headingHighlight}
            </span>
          </h1>
          <p className="text-foreground/70 text-center">
            {content.description}
          </p>
          <div className="flex items-center h-10 mt-10 gap-4">
            <button className="px-6 py-3 text-xl font-bold bg-fnred/70 border-b-4 border-fnred rounded-md active:border-0 transition-discrete duration-100 flex items-center gap-2">
              Regisrer Now
              <ArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Hero;
