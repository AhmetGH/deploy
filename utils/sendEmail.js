const nodemailer = require('nodemailer');


const sendEmail = async (to, subject, url) => {

  const transporter = nodemailer.createTransport({
    service:"gmail",
    auth: {
      user: "erencpp@gmail.com",
      pass: "uzqd mxyr tcuu ktlm"
    }
  });
  var content= ""

  if(subject === "Şifre sıfırlama")
    content = "Şifrenizi sıfırlamak için butona basınız!"
  else
    content = "Sisteme kayıt oldunuz şimdi şifrenizi oluşturun!"
  console.log(content)

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
        header {
            background-color: #000000;
            color: white;
            padding: 10px 20px;
            text-align: left;
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
    </style>
</head>
<body>
    <header style="padding-left: 50px;">
        <h1 style="margin-bottom: 0px;">HR HUB</h1>
        <h2 style="margin-top: 0px;">SUBDOMAIN &gt; B</h2>

    </header>
    <section style="padding-left: 50px;">
        <div style="padding-top: 60px; padding-bottom: 30px;" >
            <img src="https://crm-test-z2p9.onrender.com/kilit.jpeg">
            
        </div>
        <div style="margin-top:40px ;">
            <h2>${subject}</h2>
        </div>
        <div style="margin-bottom: 40px;">${content}</div>
        <div style="margin-bottom:7%;">
            <a href="${url}" style="display:inline-block; padding: 10px 20px; background-color: #000000; color: #ffffff; border-radius: 10px; text-decoration: none;">Şifre oluştur </a>

        </div>
       
        <div style="margin-bottom: 9%;">Excepteur sint occaecat cupidatat, Non proident</div>
    </section>
    <div style="padding-left: 50px; display: block; clear: both;">
        <div style="float: left;">
            Reprehenderit in voluptate velit esse <b>HR HUB</b>
        </div>
        <div style="float: right;">
            Lorem and Ipsum &bull; Dolor Sit Amet
        </div>
    <div style="clear: both;"></div>
</div>

</body>
</html>

    `;

  const mailOptions = {
    from: 'erencpp@gmail.com', 
    to: to, 
    subject: subject, 
    html: htmlEmail
  };


  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`E-posta gönderilirken hata oluştu: ${error}`);
  }
};

module.exports = sendEmail;
