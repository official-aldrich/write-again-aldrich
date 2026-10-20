'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {emptyWorkspace,mergeWorkspace,safeBackup} from './workspace';
import type {Workspace} from './types';
const storageKey='write-again-v1:local';
export function useWorkspace(_userId:string|null){
 const [workspace,setWorkspace]=useState<Workspace>(emptyWorkspace),[ready,setReady]=useState(false),[status,setStatus]=useState('Opening your studio…'),[error,setError]=useState('');
 const current=useRef(workspace),lastLocalEdit=useRef(0);
 const cache=useCallback((value:Workspace)=>{try{localStorage.setItem(storageKey,JSON.stringify(value));setStatus('Saved on this browser');return true;}catch{setStatus('Backup needed');setError('This browser could not save your latest changes. Keep this tab open and export your work in Studio settings.');return false;}},[]);
 const update=useCallback((fn:(s:Workspace)=>Workspace)=>{const next={...fn(current.current),updatedAt:new Date().toISOString()};current.current=next;lastLocalEdit.current=Date.now();cache(next);setWorkspace(next);},[cache]);
 useEffect(()=>{try{const raw=localStorage.getItem(storageKey);if(raw){const saved=safeBackup(JSON.parse(raw));current.current=saved;setWorkspace(saved);}setStatus('Saved on this browser');}catch{setStatus('Backup needed');setError('Your browser backup could not be read. Import a saved backup in Studio settings if you have one.');}setReady(true);
  function changed(event:StorageEvent){if(event.key!==storageKey||!event.newValue)return;try{const incoming=safeBackup(JSON.parse(event.newValue));const merged=mergeWorkspace(current.current,incoming,{preserveDraftConflicts:Date.now()-lastLocalEdit.current<2000});if(JSON.stringify(merged)!==JSON.stringify(current.current)){current.current=merged;setWorkspace(merged);}}catch{setError('A change from another tab could not be read. Your open draft is preserved.');}}
  window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);
 },[]);
 return {workspace,ready,status,error,update,retry:()=>{if(cache(current.current))setError('');},dismissError:()=>setError('')};
}
