import axios from 'axios';
import express from 'express';

export const processPayment = async (req: express.Request, res: express.Response) => {
    const { amount, currency, token } = req.body;

    try {
        const response = await axios.post('https://api.param.com/payments', {
            amount,
            currency,
            token,
        });

        res.status(200).json({
            success: true,
            data: response.data,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ödeme işlemi başarısız',
            error: (error as Error).message,
        });
    }
}; 