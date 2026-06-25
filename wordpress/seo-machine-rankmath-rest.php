<?php
/**
 * Plugin Name: SEO Machine - Rank Math REST API Support
 * Description: Exposes Rank Math SEO meta fields (title, description, focus keyword) via the
 *              WordPress REST API so the SEO Machine / ct-automation tool can set them when it
 *              creates or updates posts. Without this, WordPress core silently drops the
 *              rank_math_* meta keys from REST writes (they are not REST-registered by default).
 * Version: 1.0
 * Author: SEO Machine
 *
 * Installation:
 * 1. Upload this file to: wp-content/mu-plugins/seo-machine-rankmath-rest.php
 *    (mu-plugins are auto-activated; create the folder if it doesn't exist.)
 * 2. That's it. No activation needed.
 *
 * Why this is required:
 *   The WP REST API only persists `meta` keys that were registered with `show_in_rest => true`.
 *   Rank Math does NOT register its meta for REST writes, so any POST to /wp/v2/posts/{id}
 *   carrying { meta: { rank_math_title: ... } } has those keys stripped before save. This
 *   plugin registers them with show_in_rest + an edit_posts auth callback so they stick.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register Rank Math SEO meta fields for REST API read/write.
 * Gated on Rank Math being active so it is a no-op on Yoast-only sites.
 */
add_action('init', function () {
    // Only proceed if Rank Math is active
    if (!defined('RANK_MATH_VERSION') && !class_exists('RankMath')) {
        return;
    }

    $rank_math_meta_fields = [
        'rank_math_title'         => 'Rank Math SEO Title',
        'rank_math_description'   => 'Rank Math Meta Description',
        'rank_math_focus_keyword' => 'Rank Math Focus Keyword',
        // Optional extras the tool may set in future — harmless to expose.
        'rank_math_canonical_url' => 'Rank Math Canonical URL',
        'rank_math_robots'        => 'Rank Math Robots',
    ];

    foreach ($rank_math_meta_fields as $meta_key => $description) {
        register_post_meta('post', $meta_key, [
            'show_in_rest'      => true,
            'single'            => true,
            'type'              => 'string',
            'description'       => $description,
            'sanitize_callback' => 'sanitize_text_field',
            'auth_callback'     => function () {
                return current_user_can('edit_posts');
            },
        ]);
    }
});

/**
 * Convenience grouped field, mirroring the Yoast helper: lets a client read/write all three
 * core Rank Math fields via a single `rank_math_seo` object on the post resource.
 */
add_action('rest_api_init', function () {
    if (!defined('RANK_MATH_VERSION') && !class_exists('RankMath')) {
        return;
    }

    register_rest_field('post', 'rank_math_seo', [
        'get_callback' => function ($post) {
            return [
                'focus_keyword'    => get_post_meta($post['id'], 'rank_math_focus_keyword', true),
                'seo_title'        => get_post_meta($post['id'], 'rank_math_title', true),
                'meta_description' => get_post_meta($post['id'], 'rank_math_description', true),
            ];
        },
        'update_callback' => function ($value, $post) {
            if (!current_user_can('edit_post', $post->ID)) {
                return new WP_Error('rest_forbidden', 'You do not have permission to edit this post.', ['status' => 403]);
            }
            if (isset($value['focus_keyword'])) {
                update_post_meta($post->ID, 'rank_math_focus_keyword', sanitize_text_field($value['focus_keyword']));
            }
            if (isset($value['seo_title'])) {
                update_post_meta($post->ID, 'rank_math_title', sanitize_text_field($value['seo_title']));
            }
            if (isset($value['meta_description'])) {
                update_post_meta($post->ID, 'rank_math_description', sanitize_text_field($value['meta_description']));
            }
            return true;
        },
        'schema' => [
            'type'       => 'object',
            'properties' => [
                'focus_keyword'    => ['type' => 'string'],
                'seo_title'        => ['type' => 'string'],
                'meta_description' => ['type' => 'string'],
            ],
        ],
    ]);
});
