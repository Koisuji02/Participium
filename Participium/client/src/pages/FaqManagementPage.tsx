import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Stack,
    TextField,
    Typography,
    Alert,
    Snackbar,
    Card,
    CardContent,
    CardActions,
    Grid,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { getAllFaqs, createFaq, updateFaq, deleteFaq } from '../API/API';

interface Faq {
    id: number;
    question: string;
    answer: string;
}

export function FaqManagementPage() {
    const [faqs, setFaqs] = useState<Faq[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [snackOpen, setSnackOpen] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackSeverity, setSnackSeverity] = useState<'success' | 'error'>('success');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [faqToDelete, setFaqToDelete] = useState<number | null>(null);

    useEffect(() => {
        loadFaqs();
    }, []);

    const loadFaqs = async () => {
        try {
            setLoading(true);
            const data = await getAllFaqs();
            setFaqs(data);
        } catch (error) {
            showSnack('Failed to load FAQs', 'error');
            console.error('Error loading FAQs:', error);
        } finally {
            setLoading(false);
        }
    };

    const showSnack = (message: string, severity: 'success' | 'error') => {
        setSnackMessage(message);
        setSnackSeverity(severity);
        setSnackOpen(true);
    };

    const handleOpenDialog = (faq?: Faq) => {
        if (faq) {
            setEditingFaq(faq);
            setQuestion(faq.question);
            setAnswer(faq.answer);
        } else {
            setEditingFaq(null);
            setQuestion('');
            setAnswer('');
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingFaq(null);
        setQuestion('');
        setAnswer('');
    };

    const handleSaveFaq = async () => {
        if (!question.trim() || !answer.trim()) {
            showSnack('Please fill in both question and answer', 'error');
            return;
        }

        try {
            if (editingFaq) {
                await updateFaq(editingFaq.id, question, answer);
                showSnack('FAQ updated successfully', 'success');
            } else {
                await createFaq(question, answer);
                showSnack('FAQ created successfully', 'success');
            }
            handleCloseDialog();
            loadFaqs();
        } catch (error) {
            showSnack(`Failed to ${editingFaq ? 'update' : 'create'} FAQ`, 'error');
            console.error('Error saving FAQ:', error);
        }
    };

    const handleDeleteClick = (faqId: number) => {
        setFaqToDelete(faqId);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (faqToDelete === null) return;

        try {
            await deleteFaq(faqToDelete);
            showSnack('FAQ deleted successfully', 'success');
            loadFaqs();
        } catch (error) {
            showSnack('Failed to delete FAQ', 'error');
            console.error('Error deleting FAQ:', error);
        } finally {
            setDeleteConfirmOpen(false);
            setFaqToDelete(null);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h4" component="h1">
                        FAQ Management Panel
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                    >
                        Add FAQ
                    </Button>
                </Stack>

                {loading ? (
                    <Typography>Loading FAQs...</Typography>
                ) : faqs.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            No FAQs yet. Click "Add FAQ" to create your first FAQ.
                        </Typography>
                    </Paper>
                ) : (
                    <Grid container spacing={3}>
                        {faqs.map((faq) => (
                            <Grid item xs={12} key={faq.id}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" component="div" gutterBottom>
                                            Q: {faq.question}
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary">
                                            A: {faq.answer}
                                        </Typography>
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                                        <Button
                                            size="small"
                                            startIcon={<EditIcon />}
                                            onClick={() => handleOpenDialog(faq)}
                                        >
                                            Modify
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            startIcon={<DeleteIcon />}
                                            onClick={() => handleDeleteClick(faq.id)}
                                        >
                                            Delete
                                        </Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="Question"
                            fullWidth
                            multiline
                            rows={2}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Enter the frequently asked question"
                        />
                        <TextField
                            label="Answer"
                            fullWidth
                            multiline
                            rows={4}
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Enter the answer to the question"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSaveFaq} variant="contained">
                        {editingFaq ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this FAQ? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackOpen}
                autoHideDuration={4000}
                onClose={() => setSnackOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackOpen(false)}
                    severity={snackSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
}
