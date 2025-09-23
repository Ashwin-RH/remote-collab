import axios from "axios";

export const API = axios.create({
  baseURL: "http://localhost:4000"
});

export async function login(name) {
  const res = await API.post("/login", { name });
  return res.data;
}
