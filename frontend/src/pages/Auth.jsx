import { useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";
import { Lock, User } from "lucide-react";

export default function Auth({ setUser, setToken }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);
    const url = `${API_URL}/auth/${isLogin ? "login" : "signup"}`;

    try {
      const { data } = await axios.post(
        url,
        isLogin
          ? { email, password }
          : { email, password, name: username }
      );

      if (!isLogin) {
        toast.success("Signup successful! Please login.");
        setIsLogin(true);
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        toast.success("Login successful!");
        setToken(data.token);
        setUser(data.user);

        const socket = io(API_URL, { auth: { token: data.token } });
        socket.on("connect", () => {
          console.log("Connected to Socket.io with ID:", socket.id);
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md p-10 bg-gray-950/50 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-700">
        <h1 className="text-center text-3xl font-extrabold mt-4 mb-6 bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
          {isLogin ? "Sign In" : "Create Account"}
        </h1>

        {error && (
          <p className="text-red-400 bg-red-900/20 px-4 py-2 rounded mb-4 text-center font-medium">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col  gap-5">
          {!isLogin && (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-transparent border border-gray-400 focus-within:ring focus-within:ring-gray-400 transition">
              <User className="text-blue-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                className="bg-transparent w-full text-white placeholder:text-gray-400 outline-none"
              />
            </div>
          )}

          <div className="flex items-center gap-3 p-2 rounded-xl bg-transparent border border-gray-400 focus-within:ring focus-within:ring-gray-400 transition">
            <User className="text-blue-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email here..."
              required
              className="bg-transparent w-full text-white placeholder-gray-400 outline-none"
            />
          </div>

          <div className="flex items-center gap-3 p-2 rounded-xl bg-transparent border border-gray-400 focus-within:ring focus-within:ring-gray-400 transition">
            <Lock className="text-blue-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password here..."
              required
              className="bg-transparent w-full text-white placeholder-gray-400 outline-none"
            />
          </div>

          {!isLogin && (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-transparent border border-gray-400 focus-within:ring focus-within:ring-gray-400 transition">
              <Lock className="text-blue-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                required
                className="bg-transparent w-full text-white placeholder-gray-400 outline-none"
              />
            </div>
          )}

          <div className="flex justify-center ">
  <button
    type="submit"
    disabled={loading}
    className={`border-2 w-30 items-center px-10 py-1 cursor-pointer rounded-xl font-semibold text-md shadow-lg transition-all duration-500 transform-gpu active:scale-95 ${
      isLogin
        ? "border-green-400 bg-gray-900 text-green-400 hover:text-white hover:bg-green-400/80"
        : "border-blue-400 bg-gray-900 text-blue-400 hover:text-white hover:bg-blue-400/80"
    } disabled:opacity-60 disabled:cursor-not-allowed`}
  >
    {loading ? "Please wait..." : isLogin ? "Login" : "Signup"}
  </button>
</div>


        </form>

        <p className="text-center mt-6 text-gray-300 font-medium">
  {isLogin ? (
    <>
      Don't have an account?{" "}
      <span
        className="bg-gradient-to-l from-blue-500 via-teal-500 to-green-500 text-transparent bg-clip-text  rounded-lg px-1 py-0.5 cursor-pointer transition-colors font-semibold"
        onClick={() => setIsLogin(false)}
      >
        Sign Up
      </span>
    </>
  ) : (
    <>
      Already have an account?{" "}
      <span
        className="bg-gradient-to-l from-blue-500 via-teal-500 to-green-500 text-transparent bg-clip-text cursor-pointer transition-colors font-semibold"
        onClick={() => setIsLogin(true)}
      >
        Sign In
      </span>
    </>
  )}
</p>

      </div>
    </div>
  );
}
