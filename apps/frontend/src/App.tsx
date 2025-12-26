import axios from "axios";
import { useEffect, useRef, useState } from "react";

function App() {
  const [taskId, setTaskId] = useState('');
  const [taskStatus, setTaskStatus] = useState('QUEUED');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if(!taskId || taskStatus === 'COMPLETED') return;

    console.log("calling polling api...");

    const getStatus = async () => {
      try{
        const response = await axios.get(`http://localhost:3000/tasks/get-task/${taskId}`);

        console.log(response);

        setTaskStatus(response.data.status);
      } catch(err){
        console.log(err);
      }
    }

    const interval = setInterval(() => {
      getStatus();
    }, 500);

    // cleanup 
    return () => clearInterval(interval);

  }, [taskId, taskStatus])
 
  const handleClick = async () => {
    console.log("URL is: ", inputRef.current?.value);

    // send axios request to backend server and get taskId , then store it in frontend
    const response = await axios.post("http://localhost:3000/tasks/post-task", {
      githubIssueUrl: inputRef.current?.value
    })

    console.log(response);
    setTaskId(response.data.taskId);
  }

  return (
    <>
      <h1>Forge AI</h1>
      <div>
        <input type="text" ref={inputRef} placeholder="Enter github url" />
        <button onClick={handleClick}>Submit</button>
      </div>
      <div>
        <h3>Task status: </h3>
        {taskId && <span>{taskId}</span>}
        <div>{taskStatus}</div>
      </div>
    </>
  )
}

export default App;
