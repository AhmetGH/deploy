const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, url) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "erencpp@gmail.com",
      pass: "uzqd mxyr tcuu ktlm",
    },
  });
  var content = "";

  if (subject === "Şifre sıfırlama")
    content = "Şifrenizi sıfırlamak için butona basınız!";
  else content = "Sisteme kayıt oldunuz şimdi şifrenizi oluşturun!";
  console.log(content);

  const htmlEmail = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HR HUB</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #F5F5F5;
              color: #000;
              margin: 0;
              padding: 0;
          }
   
          section {
              background-color: #F5F5F5;
              padding: 20px;
          }
          button {
              background-color: #000;
              color: white;
              border: none;
              padding: 10px 20px;
              text-align: center;
              text-decoration: none;
              display: inline-block;
          }
          .footer {
              background-color: #fff;
              color: black;
              padding: 10px;
              text-align: center;
              font-size: 12px;
          }
          table {
              width: 800px;
              border-collapse: collapse;
              background-color: #F5F5F5;
          }
          th, td {
             
              text-align: left;
         
              
          }
          th {
              background-color: #000;
              color: white;
          }
      </style>
  </head>
  <body>
      <table>
          <tr>
              <td colspan="2" style="background-color: #000000; color: #ffffff;height: 140px; padding-left: 86px;">
                  <h1 style="margin-bottom: 0px;">HR HUB</h1>
                  <h2 style="margin-top: 0px;">SUBDOMAIN &gt; B</h2>
              </td>
          </tr>
          <tr>
              <td colspan="2" style="padding-left: 86px; padding-top: 86px;">
                  <img src="https://ahmetgh-deploy-deploy.onrender.com/Group.jpeg" alt="HR HUB Logo">
              </td>
          </tr>
          <tr >
              <td  colspan="2" style="padding-left: 86px; padding-top: 30px;"><h2>${subject}</h2></td>
          </tr>
          <tr>
      
              <td  colspan="2" style="padding-left: 86px;"> ipsum, dolor sit amet</td>
          </tr>
          <tr>        
              <td colspan="2"  style="padding-left: 86px; padding-top: 50px;">
                  <a href="${url}" style="display:inline-block; padding: 10px 40px 10px 40px; background-color: #0057D9; color: #ffffff; border-radius: 8px; text-decoration: none;">Şifre oluştur</a>
              </td>
          </tr>
          <tr>
              <td colspan="2"  style="padding-left: 86px; padding-top: 86px;padding-bottom: 106px; font-family:SF Pro Text; font-size: 16px; font-style: normal;font-weight: 400;">
                  Excepteur sint occaecat cupidatat, Non proident
              </td>
          </tr>
          <tr>
              <td colspan="2" style="background-color: #ffffff; font-family:SF Pro Text;
              font-size: 14px;
              font-style: normal;
              font-weight: 400;
              line-height: 22px; 
              padding-top:10px ;">
                  <div style="float: left;">Reprehenderit in voluptate velit esse <b>HR HUB</b></div>
                  <div style="float: right;">Lorem and Ipsum &bull; Dolor Sit Amet</div>
                  <div style="clear: both;"></div>
              </td>
          </tr>
      </table>
  </body>
  </html>
  

    `;

  const mailOptions = {
    from: "erencpp@gmail.com",
    to: to,
    subject: subject,
    html: htmlEmail,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`E-posta gönderilirken hata oluştu: ${error}`);
  }
};

module.exports = sendEmail;
