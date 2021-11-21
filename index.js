import { ethers } from 'ethers';


let signHtml = `
<!DOCTYPE html>
<script src="https://cdn.ethers.io/lib/ethers-5.2.umd.min.js"
        type="application/javascript"></script>
  <script>
  async function signData(){
      const enable = await window.ethereum.enable();
      if(enable){
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const signer = provider.getSigner()
        let address = await signer.getAddress();
        let signature = await signer.signMessage("MSG_TO_SIGN");
        document.getElementById("sig").innerHTML = signature;
        document.getElementById("msg").innerHTML = "MSG_TO_SIGN";
        document.getElementById("acc").innerHTML =  address;
        }
      }
  signData();
  </script>
<body>
    <h1>Sign a Message</h1>
    <p>
    Account: <span id="acc"></span>  <br>
    Message: <span id="msg"></span> <br>
    Signature: <span id="sig"></span> <br>
    </p>
  </body>
</html>`

let locationHtml= `
<!DOCTYPE html>
<script src="https://cdn.ethers.io/lib/ethers-5.2.umd.min.js"
        type="application/javascript"></script>
  <script>
    async function signData(lat, long){
        const enable = await window.ethereum.enable();
        if(enable){
          const provider = new ethers.providers.Web3Provider(window.ethereum)
          const signer = provider.getSigner()
          let address = await signer.getAddress();
          let signature = await signer.signMessage("(" + lat + "," + long + ")");
          json = { "address": address, "signature": signature, "message": "(" + lat + "," + long + ")"};
          let response = await fetch(window.location.origin + "/api/v1/attest/location", {
            method: 'POST',
            body: JSON.stringify(json),
            headers: {
              'Content-type': 'application/json; charset=UTF-8'
              }
          });
          let responseJson = await response.json();
          document.getElementById("status").innerHTML = responseJson.message;
          document.getElementById("loc").innerHTML  = responseJson.location;
          document.getElementById("addr").innerHTML = responseJson.address;
        }
    }
    navigator.geolocation.getCurrentPosition(function(position) {
      signData(position.coords.latitude, position.coords.longitude);
  });
  </script>
<body>
    <h1>Location Attestation</h1>
    <p>
    Status: <span id="status"></span> <br>
    Address: <span id="addr"></span>  <br>
    Location: <span id="loc"></span>  <br>
    </p>
  </body>
</html>`

addEventListener("fetch", (event) => {
  event.respondWith(
    handleRequest(event.request).catch(
      (err) => new Response(err.stack, { status: 500 })
    )
  );
});

/**
 * Many more examples available at:
 *   https://developers.cloudflare.com/workers/examples
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleRequest(request) {
  const { pathname } = new URL(request.url);
  let signature = "0xddd0a7290af9526056b4e35a077b9a11b513aa0028ec6c9880948544508f3c63" +
                  "265e99e47ad31bb2cab9646c504576b3abc6939a1710afc08cbf3034d73214b8" +
                  "1c";
  let signingAddress = ethers.utils.verifyMessage('hello world', signature);
  if (pathname.startsWith("/verify")) {
    let tokens = pathname.split('/');
    let address = tokens[2];
    let message = tokens[3];
    let signature = tokens[4];
    return new Response(JSON.stringify({"address": address, "message": message, "sig": signature} ), {
      headers: { "Content-Type": "application/json" },
    });
  }
  if (pathname.startsWith("/sign")) {
      let tokens = pathname.split('/');
      let message = decodeURIComponent(tokens.slice(2).join("")).replaceAll(/"/g, '\\\"');;
      let output = signHtml.replaceAll("MSG_TO_SIGN", message);
      return new Response(output, {
        headers: {
          "content-type": "text/html;charset=UTF-8",
        },
      })
  }
  if (pathname.startsWith("/attest/location")) {
      return new Response(locationHtml, {
        headers: {
          "content-type": "text/html;charset=UTF-8",
        },
      })
  }

  if (pathname.startsWith("/api/v1/attest/location")){
    const { headers } = request;
    const contentType = headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      let body = await request.json();
      let signature = body.signature;
      let address = body.address;
      let message = body.message;
      let signingAddress = ethers.utils.verifyMessage(message, signature);
      let result;
      let statusCode;
      if (signingAddress == address){
        result = "location verified";
        statusCode = 200;
        try{
          await LOCATIONS_1729.put(String(address), String(message));
        }
        catch(error) {
            console.error("Error ", error.toString());
        }
      }
      else {
        result = "location not verified. Signature did not match address";
        statusCode = 500;
      }
      return new Response(JSON.stringify({"message": result, "address": address, "location": message} ), {
        headers: { "Content-Type": "application/json" },
        status: statusCode
    });

    }
  }
};
