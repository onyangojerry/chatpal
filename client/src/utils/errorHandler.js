// client/src/utils/errorHandler.js
const handleAPIError = (error, fallbackMsg = 'An error occurred') => {
    if (error.response && error.response.data && error.response.data.msg) {
      return error.response.data.msg;
    } else if (error.message) {
      return error.message;
    }
    return fallbackMsg;
  };
  
  export default handleAPIError;