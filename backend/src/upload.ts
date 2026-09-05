import { Router, Request, Response } from 'express';
import multer from 'multer';
import { PinataSDK } from 'pinata';
import dotenv from 'dotenv';

dotenv.config();

const uploadRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT!,
    pinataGateway: process.env.PINATA_GATEWAY!,
});

uploadRouter.post('/', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const fileObj = new File([new Uint8Array(req.file.buffer)], req.file.originalname, {
            type: req.file.mimetype,
        });

        const uploadResult = await pinata.upload.public.file(fileObj);

        return res.status(200).json({
            message: 'File successfully pinned to IPFS',
            cid: uploadResult.cid,
            mediaUrl: `https://${process.env.PINATA_GATEWAY}/ipfs/${uploadResult.cid}`,
        });
    } catch (error: any) {
        console.error('IPFS Upload Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to upload to IPFS' });
    }
});

export default uploadRouter;
