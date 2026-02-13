import Link from "next/link"

const HeaderSection = () => {
  return (
    <div className="border-b-2 shadow-md p-4 font-semibold sticky top-0 z-50 bg-background">
      <div className=" lg:max-w-7xl lg:mx-auto flex items-center justify-between">
      <h1 className="text-3xl font-mono tracking-tighter">Foundathon</h1>

      <div className="flex items-center gap-2">
        <Link href="/about" className="text-foreground px-2 py-1 hover:bg-foreground/10 rounded-sm transition duration-200">
          About
        </Link>
        <Link href="/contact" className="text-foreground px-2 py-1 hover:bg-foreground/10 rounded-sm transition duration-200">
          Contact
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <button className="px-4 py-2 bg-gray-200 border-b-4 border-gray-400 rounded-md active:border-0 transition-discrete duration-100">Log In</button>
        <button className="px-4 py-2 bg-fnblue/70 border-b-4 border-fnblue rounded-md active:border-0 transition-discrete duration-100">Sign Up</button>
      </div>
      </div>
    </div>
  )
}
export default HeaderSection