/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// Type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
    try {
        const urlType =
            type === 'password' ? 'update-password' : 'updateProfile';

        const res = await axios({
            method: 'PATCH',
            url: `http://127.0.0.1:3000/api/v1/users/${urlType}`,
            data
        });

        if (res.data.status === 'success') {
            showAlert('success', 'Settings updated successfully 😊');
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    }
};
