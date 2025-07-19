import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { updateJobStatus } from '../store/videoJobsSlice';
import { getPrimaryWebSocketUrl, API_ENDPOINTS } from '../config/api.js';

const WS_URL = getPrimaryWebSocketUrl(API_ENDPOINTS.PRIMARY.ENDPOINTS.WEBSOCKET_JOBS);

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
