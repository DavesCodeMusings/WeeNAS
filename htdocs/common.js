/*
  common.js -- common script used throughout all admin pages
*/

// Make an async call to the API url and pass the parsed JSON to the callback. 
function AJAX(method, url, callback) {
  document.body.style.cursor = 'wait';
  let authHeader = sessionStorage.getItem('auth');
  let xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        callback(JSON.parse(this.responseText));
      }
      else {
        alert(`Error communicating with server.\n${this.responseText}`);
      }
      document.body.style.cursor = 'default';
    }
  };
  xhttp.open(method, url, true);
  xhttp.setRequestHeader('Authorization', authHeader);
  xhttp.send();
}
