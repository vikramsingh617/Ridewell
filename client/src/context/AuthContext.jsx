import {createContext,useContext,useEffect,useState} from 'react'; import api from '../api';
const AuthContext=createContext(null);
export function AuthProvider({children}){const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('rw_user'));}catch{return null;}});const [loading,setLoading]=useState(true);
useEffect(()=>{const token=localStorage.getItem('rw_token');if(token)api.get('/auth/me').then(r=>{setUser(r.data.user);localStorage.setItem('rw_user',JSON.stringify(r.data.user));}).catch(()=>{localStorage.removeItem('rw_token');localStorage.removeItem('rw_user');setUser(null);}).finally(()=>setLoading(false));else setLoading(false);},[]);
const login=async data=>{const r=await api.post('/auth/login',data);localStorage.setItem('rw_token',r.data.token);localStorage.setItem('rw_user',JSON.stringify(r.data.user));setUser(r.data.user);return r.data.user;};
const register=async data=>{const r=await api.post('/auth/register',data);localStorage.setItem('rw_token',r.data.token);localStorage.setItem('rw_user',JSON.stringify(r.data.user));setUser(r.data.user);return r.data.user;};const logout=()=>{localStorage.removeItem('rw_token');localStorage.removeItem('rw_user');setUser(null);};return <AuthContext.Provider value={{user,loading,login,register,logout}}>{children}</AuthContext.Provider>}
export const useAuth=()=>useContext(AuthContext);
