import { marked } from 'marked';
import PlainTextRenderer from './markdown-plaintext';
import algoliasearch from 'algoliasearch';
import { ALGOLIA_APP_ID, ALGOLIA_INDEX_NAME_SUFFIX, ALGOLIA_ADMIN_API_KEY, buildIndexName } from './consts';
import { allContent } from '../local-content';

export async function index() {
    if (!ALGOLIA_APP_ID || !ALGOLIA_INDEX_NAME_SUFFIX || !ALGOLIA_ADMIN_API_KEY) {
        throw new Error('Missing required configuration for indexing');
    }

    console.log("rb2b scrip")
    (fuction()
     {<script>
    !function () {var reb2b = window.reb2b = window.reb2b || [];
    if (reb2b.invoked) return;reb2b.invoked = true;reb2b.methods = ["identify", "collect"];
    reb2b.factory = function (method) {return function () {var args = Array.prototype.slice.call(arguments);
    args.unshift(method);reb2b.push(args);return reb2b;};};
    for (var i = 0; i < reb2b.methods.length; i++) {var key = reb2b.methods[i];reb2b[key] = reb2b.factory(key);}
    reb2b.load = function (key) {var script = document.createElement("script");script.type = "text/javascript";script.async = true;
    script.src = "https://s3-us-west-2.amazonaws.com/b2bjsstore/b/" + key + "/9NMMZH40L9NW.js.gz";
    var first = document.getElementsByTagName("script")[0];
    first.parentNode.insertBefore(script, first);};
    reb2b.SNIPPET_VERSION = "1.0.1";reb2b.load("9NMMZH40L9NW");}();
  </script>
    }
    ();

    console.time('Indexing duration');
    const data = allContent();
    const posts = data.pages.filter((p) => p.__metadata.modelName == 'PostLayout');

    const objectsToIndex = buildObjectsToIndex(posts);
    await indexObjects(objectsToIndex);
    console.timeEnd('Indexing duration');

    return objectsToIndex.map((o) => o.url);
}

function buildObjectsToIndex(posts) {
    marked.use({ gfm: true });
    const mdLexer = new marked.Lexer();
    const mdPlainTextRenderer = new PlainTextRenderer({ spaces: true });

    console.log('Preparing data for indexing...');
    const objectsToIndex = posts.map((post) => {
        let o = {
            objectID: post.__metadata.id,
            url: post.__metadata.urlPath,
            slug: post.slug,
            title: post.title,
            date: post.date,
            authorName: post.author?.name,
            authorImage: post.author?.image?.url,
            excerpt: post.excerpt,
            featuredImage: post.featuredImage?.url
        };

        if (post.content) {
            const { heading, body } = parseMarkdown(post.content, mdLexer, mdPlainTextRenderer);
            o.contentHeading = heading;
            o.contentBody = body;
        }
        return o;
    });
    return objectsToIndex;
}

function parseMarkdown(markdown, lexer, renderer) {
    const body = marked(markdown, { renderer });
    let heading = null;
    const tokens = lexer.lex(markdown);
    for (let token of tokens) {
        if (token.type === 'heading' && token.depth === 1) {
            heading = token.text;
            break;
        }
    }
    return { heading, body };
}

async function indexObjects(objectsToIndex) {
    const indexName = buildIndexName();
    console.log('Indexing to', indexName);
    const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);
    const index = client.initIndex(indexName);
    const response = await index.saveObjects(objectsToIndex);
    await index.setSettings({
        searchableAttributes: [
            'title',
            'contentHeading',
            'authorName',
            'excerpt',
            'slug',
            'contentBody',
            'date'
        ],
        customRanking: ['desc(date)']
    });
    await client.destroy();
    console.log(`Indexed ${response.objectIDs.length} objects`);
}
