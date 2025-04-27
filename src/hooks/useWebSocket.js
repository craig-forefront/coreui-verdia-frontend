import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { updateJobStatus } from '../store/videoJobsSlice';

const WS_URL = process.env.REACT_APP_WS_URL || "ws://localhost:8000/ws/jobs";

const useWebSocket = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      dispatch(updateJobStatus(data));
    };

    ws.onclose = () => {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    return () => {
      ws.close();
    };
  }, [dispatch]);
};

export default useWebSocket;
