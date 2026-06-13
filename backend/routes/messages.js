const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const messageUpload = require('../middleware/messageUpload');
const { getMessages, createMessage, updateMessage, deleteMessage } = require('../controllers/messageController');

router.use(authenticate);
router.get('/',      getMessages);
router.post('/',     messageUpload.single('attachment'), createMessage);
router.put('/:id',   messageUpload.single('attachment'), updateMessage);
router.delete('/:id', deleteMessage);

module.exports = router;
