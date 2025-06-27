import { Router, Request, Response, NextFunction } from 'express';
import { check, validationResult } from 'express-validator';
import {
    createHub,
    updateHub,
    deleteHub,
    getHubById,
    getHubsByUser,
    getAllHubs
} from '../controllers/HubController';
import { protect } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';

const router = Router();

// Middleware to validate and return errors as JSON
const validate = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// **Get All Hubs**
router.get('/all', optionalAuth, getAllHubs);

// **Get Hubs Belonging to the Logged-in User**
router.get('/user', protect, getHubsByUser);

// **Get a Specific Hub by ID**
router.get('/:id', getHubById);

// **Create New Hub**
router.post(
    '/',
    protect,
    [
        check('name', 'Hub name is required').notEmpty(),
        check('type', 'Hub type is required').notEmpty(),
        check('address', 'Address is required').notEmpty(),
        check('website')
            .optional({ nullable: true, checkFalsy: true })
            .isURL()
            .withMessage('Please enter a valid website URL'),
        check('email')
            .optional({ nullable: true, checkFalsy: true })
            .isEmail()
            .withMessage('Please enter a valid email address'),
        check('applicationUrl')
            .optional({ nullable: true, checkFalsy: true })
            .isURL()
            .withMessage('Please enter a valid application URL'),
    ],
    validate,
    createHub
);

// **Update Hub**
router.put(
    '/:id',
    protect,
    [
        check('website')
            .optional({ nullable: true, checkFalsy: true })
            .isURL()
            .withMessage('Please enter a valid website URL'),
        check('email')
            .optional({ nullable: true, checkFalsy: true })
            .isEmail()
            .withMessage('Please enter a valid email address'),
        check('applicationUrl')
            .optional({ nullable: true, checkFalsy: true })
            .isURL()
            .withMessage('Please enter a valid application URL'),
    ],
    validate,
    updateHub
);

// **Delete Hub**
router.delete('/:id', protect, deleteHub);

export default router;
