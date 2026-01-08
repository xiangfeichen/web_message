import indexHtml from '../index.html';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    try {
      // Serve HTML page
      if (path === '/' || path === '/index.html') {
        return new Response(indexHtml, {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
          },
        });
      }

      // API: Get all messages (with pagination)
      if (path === '/api/messages' && request.method === 'GET') {
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = 10;
        const offset = (page - 1) * limit;

        const { results } = await env.DB.prepare(
          'SELECT id, content, email, created_at, image_type FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?'
        )
          .bind(limit, offset)
          .all();

        const totalResult = await env.DB.prepare(
          'SELECT COUNT(*) as total FROM messages'
        ).first();

        const total = totalResult.total;
        const totalPages = Math.ceil(total / limit);

        const messages = results.map(msg => ({
          ...msg,
          imageUrl: msg.image_type ? `/api/images/${msg.id}` : null
        }));

        return new Response(JSON.stringify({
          messages,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        });
      }

      // API: Create new message
      if (path === '/api/messages' && request.method === 'POST') {
        const formData = await request.formData();
        const content = formData.get('content');
        const name = formData.get('name');
        const imageFile = formData.get('image');

        // Validation
        if (!content || !name) {
          return new Response(
            JSON.stringify({ error: '留言内容和名字不能为空' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            }
          );
        }

        // Email validation removed, treating 'email' column as 'name'
        const email = name; // Store name in email column



        // Content length validation
        if (content.length > 1000) {
          return new Response(
            JSON.stringify({ error: '留言内容不能超过1000个字符' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            }
          );
        }

        let imageData = null;
        let imageType = null;

        if (imageFile && imageFile instanceof File) {
          // Image validation
          if (imageFile.size > 5 * 1024 * 1024) { // 5MB limit
            return new Response(
              JSON.stringify({ error: '图片大小不能超过5MB' }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders,
                },
              }
            );
          }

          if (!imageFile.type.startsWith('image/')) {
            return new Response(
              JSON.stringify({ error: '只允许上传图片文件' }),
              {
                status: 400,
                headers: {
                  'Content-Type': 'application/json',
                  ...corsHeaders,
                },
              }
            );
          }

          imageData = await imageFile.arrayBuffer();
          imageType = imageFile.type;
        }

        // Insert message
        const result = await env.DB.prepare(
          'INSERT INTO messages (content, email, image_data, image_type, created_at) VALUES (?, ?, ?, ?, datetime("now"))'
        )
          .bind(content, email, imageData, imageType)
          .run();

        if (result.success) {
          return new Response(
            JSON.stringify({
              success: true,
              message: '留言发送成功',
            }),
            {
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            }
          );
        } else {
          throw new Error('保存留言失败');
        }
      }

      // API: Get image
      if (path.startsWith('/api/images/') && request.method === 'GET') {
        const id = path.split('/').pop();

        const message = await env.DB.prepare(
          'SELECT image_data, image_type FROM messages WHERE id = ?'
        )
          .bind(id)
          .first();

        if (!message || !message.image_data) {
          return new Response('Image not found', { status: 404 });
        }

        // D1 might return BLOBs as arrays, convert to Uint8Array if needed
        const imageData = message.image_data instanceof Array
          ? new Uint8Array(message.image_data)
          : message.image_data;

        return new Response(imageData, {
          headers: {
            'Content-Type': message.image_type,
            'Cache-Control': 'public, max-age=86400', // Cache for 1 day
          },
        });
      }

      // API: Delete message
      if (path.startsWith('/api/messages/') && request.method === 'DELETE') {
        const id = path.split('/').pop();

        const result = await env.DB.prepare(
          'DELETE FROM messages WHERE id = ?'
        )
          .bind(id)
          .run();

        if (result.success) {
          return new Response(
            JSON.stringify({ success: true, message: '留言已删除' }),
            {
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            }
          );
        } else {
          return new Response(
            JSON.stringify({ error: '删除失败' }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
              },
            }
          );
        }
      }

      // 404 Not Found
      return new Response('Not Found', {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({ error: '服务器错误: ' + error.message }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  },
};
