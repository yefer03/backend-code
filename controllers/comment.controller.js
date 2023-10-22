
const { response, request } = require('express');

const User = require('../models/user');
const Comment = require('../models/comment');
const Publication = require('../models/publication');


const addComment = async (req = request, res = response) => {

    const { id } = req.params;
    const { text, parentComment, publication } = req.body; // Ahora también se envía el ID de la publicación.

    try {
        const existeAuthor = await User.findById(id);
        if (!existeAuthor) {
            return res.status(400).json({
                ok: false,
                msg: 'El ID de usuario no coincide con ninguno en la base de datos',
            });
        }

        // Verificar si la publicación existe
        const existePublication = await Publication.findById(publication);
        if (!existePublication) {   
            return res.status(400).json({
                ok: false,
                msg: 'El ID de la publicación no existe',
            });
        }

        const newComment = new Comment({
            text,
            author: id,
            parentComment: parentComment,
            publication: publication, // Establece la referencia a la publicación.
        });

        await newComment.save();

        // Agregar el ID del comentario al arreglo de comentarios en la publicación
        existePublication.comments.push(newComment._id);
        await existePublication.save();

        const comments = await getCommentsByPublication( publication )

        res.status(201).json({
            ok: true,
            msg: 'Comentario creado exitosamente',
            comments
        });

    } catch (error) {

        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear el comentario',
        });
    };
};



// Controlador para agregar una respuesta a un comentario
const replyToComment = async ( req = request, res = response ) => {

    const { id } = req.params;
    const { text, parentComment, publication } = req.body;

    try {
        const existeAuthor = await User.findById(id);
        if (!existeAuthor) {
            return res.status(400).json({
                ok: false,
                msg: 'El ID de usuario no coincide con ninguno en la base de datos',
            });
        }

        // Verificar si el comentario padre existe
        const existeParentComment = await Comment.findById(parentComment);
        if (!existeParentComment) {
            return res.status(400).json({
                ok: false,
                msg: 'El comentario padre no existe',
            });
        }

        // Verificar si la publicación existe
        const existePublication = await Publication.findById(publication);
        if (!existePublication) {
            return res.status(400).json({
                ok: false,
                msg: 'El ID de la publicación no existe',
            });
        }

        // Crear el nuevo comentario
        const newComment = new Comment({
            text,
            author: id,
            parentComment: parentComment,
            publication: publication,
        });

        await newComment.save();

        // Agregar la referencia del comentario de respuesta al comentario padre
        existeParentComment.replys.push(newComment);
        await existeParentComment.save();

        const comments = await getCommentsByPublication( publication )

        res.status(201).json({
            ok: true,
            msg: 'Respuesta al comentario creada exitosamente',
            comments,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear la respuesta al comentario',
        });
    }
};



const getCommentsByPublication = async ( id = '' ) => {

    try {

        const existePublication = await Publication.findById( id );

        if (!existePublication) {

            return 'La publicación no existe'

        }

        // Obtener todos los comentarios relacionados con la publicación
        const allComments = await Comment.find({ publication: id })
            .populate({
                path: 'author',
                select: 'name lastName imageProfile',
            })
            .populate({
                path: 'replys',
                populate: [
                    {
                        path: 'author',
                        select: 'name lastName imageProfile',
                    },
                    {
                        path: 'replys',
                        populate: {
                            path: 'author',
                            select: 'name lastName imageProfile',
                        },
                    },
                ],
                select: '-__v',
            })
            .select('-__v');        
        
        // Filtrar solo los comentarios principales (sin un padre)
        const mainComments = allComments.filter(comment => !comment.parentComment);

        return mainComments;

    } catch (error) {

        console.error(error);

        return 'Error al obtener los comentarios'

    };
};


module.exports = {
    addComment,
    replyToComment,
};