// src/pages/Auth.jsx
import { useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";

export default function Auth({ setUser, setToken }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    setLoading(true);
    const url = `http://localhost:4000/auth/${isLogin ? "login" : "signup"}`;

    try {
    const { data } = await axios.post(url, isLogin 
      ? { email, password } 
      : { email, password, name: username } 
    );
      
      if (!isLogin) {
        alert("Signup successful! Please login.");
        toast.success("Signup successful! Please login.");
        setIsLogin(true);
      } else {
        // Save token & user
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        console.log(localStorage.getItem("token"));
        console.log(localStorage.getItem("user"));
        toast.success("Login successful!");
        setToken(data.token);
        setUser(data.user);


        // Connect to socket after login
        console.log("Token being used for socket:", data.token);
        const socket = io("http://localhost:4000", { auth: { token: data.token } });
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
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-xl w-80 shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? "Login" : "Signup"}
        </h1>

        {error && <p className="text-red-500 mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="p-2 rounded bg-gray-700 text-white border border-gray-600"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="p-2 rounded bg-gray-700 text-white border border-gray-600"
          />
          {!isLogin && (
            <input
    type="text"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    placeholder="Username"
    required
    className="p-2 rounded bg-gray-700 text-white border border-gray-600"
  />
)}          {!isLogin && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              required
              className="p-2 rounded bg-gray-700 text-white border border-gray-600"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="p-2 bg-green-500 hover:bg-green-600 rounded text-white font-bold transition-colors"
          >
            {loading ? "Please wait..." : isLogin ? "Login" : "Signup"}
          </button>
        </form>

        <p
          className="text-center mt-4 text-blue-400 cursor-pointer hover:underline"
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "Create an account?" : "Already have an account?"}
        </p>
      </div>
    </div>
  );
}
