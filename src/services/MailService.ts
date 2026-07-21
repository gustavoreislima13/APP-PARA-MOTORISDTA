import nodemailer from 'nodemailer';

export class MailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static async getTransporter() {
    if (this.transporter) return this.transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465', 
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Fallback to ethereal for testing/development if no real credentials provided
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Using Ethereal Mail for testing. Check console for preview URLs.');
    }
    return this.transporter;
  }

  public static async sendRideNotification(driverEmail: string, rideDetails: any) {
    const transporter = await this.getTransporter();

    const stopsHtml = rideDetails.stops && rideDetails.stops.length > 0 
      ? `<li><strong>Paradas:</strong> ${rideDetails.stops.join(', ')}</li>`
      : '';

    const htmlContent = `
      <h2>Nova Solicitação de Corrida</h2>
      <p>Você recebeu uma nova solicitação de corrida. Confira os detalhes abaixo:</p>
      <ul>
        <li><strong>Passageiro:</strong> ${rideDetails.passengerName} (${rideDetails.passengerEmail})</li>
        <li><strong>Origem:</strong> ${rideDetails.origin}</li>
        ${stopsHtml}
        <li><strong>Destino:</strong> ${rideDetails.destination}</li>
        <li><strong>Distância:</strong> ${Number(rideDetails.distanceKm).toFixed(1)} km</li>
        <li><strong>Tempo Estimado:</strong> ${Number(rideDetails.timeMins).toFixed(0)} min</li>
        <li><strong>Valor a Cobrar:</strong> R$ ${Number(rideDetails.price).toFixed(2)}</li>
      </ul>
      <p>Acesse seu painel para mais detalhes e para entrar em contato com o passageiro.</p>
    `;

    try {
      const info = await transporter.sendMail({
        from: '"DriverMetrics App" <noreply@drivermetrics.app>',
        to: driverEmail,
        subject: "Nova Corrida Agendada!",
        html: htmlContent,
      });

      console.log("Email sent: %s", info.messageId);
      if (!process.env.SMTP_HOST) {
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }
}
