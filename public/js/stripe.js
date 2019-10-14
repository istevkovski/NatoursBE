/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe('pk_test_azc0rPyzYAqDC1gaTyRjGl2R00M1TRO030');

export const bookTour = async tourId => {
    try {
        // Get checkout session from api
        const session = await axios(
            `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
        );

        // Create checkout form and charge process
        await stripe.redirectToCheckout({
            sessionId: session.data.session.id
        });
    } catch (err) {
        showAlert('error', err);
    }
};
